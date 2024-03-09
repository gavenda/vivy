import WebSocket from 'ws';
import { Lavalink } from './link';
import {
  EventType,
  LavalinkEventReceivePayload,
  LavalinkReceivePayload,
  OpCode,
  PlayerUpdatePayload,
  ReadyPayload,
  Stats,
  StatsPayload,
  UpdatePlayerOptions
} from './payload';
import { PlayerState, RepeatMode } from './player';
import { LavalinkRestApi } from './rest';
import { Player, PlayerOptions } from './player';

export interface LavalinkNodeOptions {
  host: string;
  port: number;
  authorization: string;
  secure: boolean;
  reconnectTimeout?: number;
}

export class LavalinkNode<UserData> {
  socket: WebSocket | null = null;
  stats: Stats = {
    players: 0,
    playingPlayers: 0,
    uptime: 0,
    memory: {
      free: 0,
      used: 0,
      allocated: 0,
      reservable: 0
    },
    cpu: {
      cores: 0,
      systemLoad: 0,
      lavalinkLoad: 0
    }
  };
  options: LavalinkNodeOptions;
  link: Lavalink<UserData>;
  rest: LavalinkRestApi<UserData>;
  nodeId: string;
  userId: string;
  reconnectTimeout: number;
  sessionId: string | null = null;
  players = new Map<string, Player<UserData>>();
  hasDisconnected = false;

  constructor(link: Lavalink<UserData>, userId: string, options: LavalinkNodeOptions) {
    this.link = link;
    this.userId = userId;
    this.options = options;
    this.nodeId = options.host;
    this.reconnectTimeout = options.reconnectTimeout ?? 60000;
    this.rest = new LavalinkRestApi(options);
  }

  get connected() {
    return this.sessionId !== undefined || this.sessionId !== null;
  }

  get authorization() {
    return this.options.authorization;
  }

  async connect() {
    const { authorization, host, port, secure } = this.options;

    const previousSessionId = await this.link.redis.get(`lavalink:session:${host}`);

    const headers: Record<string, string> = {
      Authorization: authorization,
      'User-Id': this.userId,
      'Client-Name': 'Vivy/1.0'
    };

    if (previousSessionId) {
      headers['Session-Id'] = previousSessionId;
    }

    const websocketUrl = `ws://${host}/`;
    const socketUrl = new URL('/v4/websocket', websocketUrl);

    socketUrl.port = String(port);
    socketUrl.protocol = secure ? 'wss' : 'ws';

    this.socket = new WebSocket(socketUrl, { headers });
    this.socket.on('open', this.onWebSocketOpen.bind(this));
    this.socket.on('message', this.onWebSocketMessage.bind(this));
    this.socket.on('close', this.onWebSocketClose.bind(this));
    this.socket.on('error', this.onWebSocketError.bind(this));
  }

  private async onWebSocketClose() {
    this.sessionId = null;
    this.rest.sessionId = null;
    this.hasDisconnected = true;
    this.link.emit('nodeDisconnected', this);

    // Taken from https://lavathis.link.dev/api/#resuming
    // Special notes: If Lavalink-Server suddenly dies (think SIGKILL) the client will have to terminate any audio
    await this.disconnectPlayers();

    // Reconnection attempt
    setTimeout(() => this.connect(), this.reconnectTimeout);
  }

  private onWebSocketError(error: Error) {
    this.link.emit('nodeError', this, error);
  }

  private async onWebSocketMessage(data: WebSocket.RawData) {
    const buffer = Array.isArray(data) ? Buffer.concat(data) : data instanceof ArrayBuffer ? Buffer.from(data) : data;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload: LavalinkReceivePayload<UserData> = JSON.parse(buffer.toString());

    switch (payload.op) {
      case OpCode.READY:
        await this.handleReady(payload);
        break;
      case OpCode.STATS:
        this.handleStats(payload);
        break;
      case OpCode.PLAYER_UPDATE:
        this.handlePlayerUpdate(payload);
        break;
      case OpCode.EVENT:
        await this.handleEvent(payload);
        break;
    }
  }

  private onWebSocketOpen() {
    this.link.emit('nodeConnected', this);
  }

  private async handleReady(payload: ReadyPayload) {
    this.sessionId = payload.sessionId;
    this.rest.sessionId = payload.sessionId;

    // Save session id to redis
    await this.link.redis.set(`lavalink:session:${this.options.host}`, payload.sessionId);

    if (payload.resumed) {
      await this.handleResume();
      return;
    }

    await this.ready();
  }

  private async ready() {
    // Tell lavalink we'll resume when we somehow disconnect
    await this.rest.updateSession({
      resuming: true,
      timeout: 300
    });

    // Sync players to their last known state
    await this.syncPlayers();

    // We are now ready
    this.link.emit('nodeReady', this);
  }

  private async handleResume() {
    if (this.hasDisconnected) {
      // We have resumed a disconnected session
      this.link.emit('nodeResumed', this);
      return;
    }

    // This is a completely new session (meaning our discord ws disconnected), sync
    await this.ready();
  }

  private handleStats(payload: StatsPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { op, ...stats } = payload;
    this.stats = stats;
  }

  private handlePlayerUpdate(payload: PlayerUpdatePayload) {
    const player = this.players.get(payload.guildId);

    if (!player) return;

    if (player.connected != payload.state.connected) {
      if (payload.state.connected) {
        this.link.emit('playerConnected', player);
      } else {
        this.link.emit('playerDisconnected', player);
        player.playing = false;
      }
    }

    player.position = payload.state.position;
    player.ping = payload.state.ping;
    player.time = payload.state.time;
    player.connected = payload.state.connected;
  }

  private async handleEvent(payload: LavalinkEventReceivePayload<UserData>) {
    const player = this.players.get(payload.guildId);

    if (!player) return;

    switch (payload.type) {
      case EventType.TRACK_START: {
        player.playing = true;
        player.queue.current = payload.track;
        this.link.emit('trackStart', player, payload.track);
        break;
      }
      case EventType.TRACK_END: {
        player.playing = false;
        player.queue.previous = payload.track;
        player.queue.current = null;

        this.link.emit('trackEnd', player, payload.track, payload.reason);

        if (payload.reason === 'replaced') return;

        if (player.repeatMode === RepeatMode.TRACK && player.queue.current) {
          await player.play(payload.track);
        } else if (player.repeatMode === RepeatMode.QUEUE && player.queue.current) {
          player.queue.enqueue(payload.track);
          await player.play(player.queue.dequeue());
        } else if (player.queue.next) {
          await player.play(player.queue.dequeue());
        } else {
          this.link.emit('queueEnd', player);
          player.attemptAutoLeave();
        }
        break;
      }
      case EventType.TRACK_EXCEPTION: {
        player.playing = false;
        player.queue.current = null;
        await player.stop();
        this.link.emit('trackError', player, payload.track, payload.error, payload.exception);
        break;
      }
      case EventType.TRACK_STUCK: {
        player.playing = false;
        player.queue.current = null;
        await player.stop();
        this.link.emit('trackStuck', player, payload.track, payload.thresholdMs);
        break;
      }
      case EventType.WEBSOCKET_CLOSED: {
        this.link.emit('playerSocketClosed', player, payload.code, payload.byRemote, payload.reason);
        break;
      }
    }
  }

  private async syncPlayers() {
    const playerStateKeys = await this.link.redis.keys(`player:state:${this.options.host}:*`);

    for (const playerStateKey of playerStateKeys) {
      const [, , , guildId] = playerStateKey.split(':');
      await this.restorePlayer(guildId);
    }
  }

  async restorePlayer(guildId: string) {
    const stateStr = await this.link.redis.get(`player:state:${this.options.host}:${guildId}`);
    if (!stateStr) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const state: PlayerState = JSON.parse(stateStr);

    // Restore player instance
    const player = new Player(this.link, this, {
      guildId: state.guildId,
      autoLeave: state.autoLeave,
      autoLeaveMs: state.autoLeaveMs
    });

    // Begin sync
    player.repeatMode = state.repeatMode;

    // Sync volume
    await player.setVolume(state.volume);

    // Sync voice state
    if (state.voice.endpoint && state.voice.sessionId && state.voice.token) {
      await player.update({
        voice: {
          endpoint: state.voice.endpoint,
          sessionId: state.voice.sessionId,
          token: state.voice.token
        }
      });
    }

    // Calling init to restore queue
    await player.init();
    // Add to map
    this.players.set(guildId, player);

    // Sync playing state
    if (state.playing && state.voiceChannelId) {
      await player.connect(state.voiceChannelId);
      await player.play(player.queue.current);
      await player.update({ position: state.position });
    }
  }

  async createPlayer(options: PlayerOptions) {
    // Check existing players
    if (this.players.has(options.guildId)) {
      const player = this.players.get(options.guildId);

      if (!player) {
        throw new Error('Possible race condition occured');
      }

      return player;
    } else {
      const player = new Player(this.link, this, options);
      await player.init();
      this.players.set(options.guildId, player);
      return player;
    }
  }

  async loadTrack(identifier: string) {
    return this.rest.loadTracks(identifier);
  }

  async disconnectPlayers() {
    for (const player of this.players.values()) {
      await player.disconnect();
    }
  }

  async destroyPlayers() {
    for (const player of this.players.values()) {
      await this.rest.destroyPlayer(player.guildId);
      await this.link.redis.del(player.stateKey);
    }
    this.players.clear();
  }

  async destroyPlayer(guildId: string) {
    const player = this.players.get(guildId);

    await this.rest.destroyPlayer(guildId);

    if (player) {
      await this.link.redis.del(player.stateKey);
    }

    this.players.delete(guildId);
  }

  async updatePlayer(guildId: string, options: UpdatePlayerOptions<UserData>) {
    await this.rest.updatePlayer(guildId, options);
  }
}
