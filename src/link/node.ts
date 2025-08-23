import { logger } from '@app/logger';
import { version } from '@app/version';
import WebSocket from 'ws';
import { Lavalink } from './link';
import {
  EventType,
  type LavalinkEventReceivePayload,
  type LavalinkReceivePayload,
  OpCode,
  type PlayerUpdatePayload,
  type ReadyPayload,
  type Stats,
  type StatsPayload,
  TrackEndReason,
  type UpdatePlayerOptions
} from './payload';
import { Player, type PlayerOptions, RepeatMode } from './player';
import type { PlayerState } from './player.state';
import { LavalinkRestApi } from './rest';

export interface LavalinkNodeOptions {
  /**
   * The lavalink host.
   */
  host: string;
  /**
   * The lavalink port.
   */
  port: number;
  /**
   * The lavalink password.
   */
  authorization: string;
  /**
   * Set to true if using a secure protocol.
   */
  secure: boolean;
  /**
   * Reconnect timeout in milliseconds.
   */
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
  nodeId: string;
  userId: string;
  reconnectTimeout: number;
  hasDisconnected = false;

  // Private
  #players = new Map<string, Player<UserData>>();
  #rest: LavalinkRestApi<UserData>;
  #sessionId: string | null = null;

  constructor(link: Lavalink<UserData>, userId: string, options: LavalinkNodeOptions) {
    this.link = link;
    this.userId = userId;
    this.options = options;
    this.nodeId = options.host;
    this.reconnectTimeout = options.reconnectTimeout ?? 60000;
    this.#rest = new LavalinkRestApi(this, options);
  }

  /**
   * Returns a list of players that belong to this node.
   */
  get players() {
    return [...this.#players.values()];
  }

  /**
   * Returns the password of this node.
   */
  get authorization() {
    return this.options.authorization;
  }

  get connected() {
    return this.sessionId !== null;
  }

  get sessionId(): string {
    if (!this.#sessionId) {
      throw new Error('No session identifier is set! This will lead to awkward executions.');
    }
    return this.#sessionId;
  }

  set sessionId(value: string) {
    logger.info('New session id set', { sessionId: value });
    this.#sessionId = value;
  }

  clearSessionId() {
    logger.info('Session cleared');
    this.#sessionId = null;
  }

  hasGuildId(guildId: string) {
    return this.#players.has(guildId);
  }

  findByGuildId(guildId: string) {
    return this.#players.get(guildId);
  }

  private clearVoiceSessions() {
    for (const player of this.#players.values()) {
      player.clearVoiceSession();
    }
  }

  /**
   * Establish a connection to the lavalink server.
   */
  async connect() {
    const { authorization, host, port, secure } = this.options;

    const previousSessionId = await this.link.redis.get(`lavalink:session:${host}`);

    const headers: Record<string, string> = {
      'Authorization': authorization,
      'User-Id': this.userId,
      'Client-Name': `Vivy/${version}`
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
    this.clearSessionId();
    this.clearVoiceSessions();
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
        await this.handlePlayerUpdate(payload);
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
    await this.#rest.updateSession({
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

  private async handlePlayerUpdate(payload: PlayerUpdatePayload) {
    const player = this.findByGuildId(payload.guildId);

    if (!player) return;

    if (player.voiceConnected != payload.state.connected) {
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

    // Save state
    await player.queue.saveState();
    await player.saveState();
  }

  private async handleEvent(payload: LavalinkEventReceivePayload<UserData>) {
    const player = this.findByGuildId(payload.guildId);

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

        if (payload.reason === TrackEndReason.REPLACED) return;

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
        this.link.emit('trackError', player, payload.track, payload.exception);
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

  /**
   * Restores a player to their previous state.
   * @param guildId guild id of the player
   */
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
    await player.applyVolume(state.volume);

    // Sync voice state
    if (state.voiceState?.endpoint && state.voiceState.sessionId && state.voiceState.token) {
      await player.update({
        voice: {
          endpoint: state.voiceState.endpoint,
          sessionId: state.voiceState.sessionId,
          token: state.voiceState.token
        }
      });
    }

    // Calling init to restore queue
    await player.init();
    // Add to map
    this.#players.set(guildId, player);

    // Sync playing state
    if (state.playing && state.voiceChannelId) {
      await player.connect(state.voiceChannelId);
      await player.play(player.queue.current);
      await player.update({ position: state.position });
    }
  }

  /**
   * Create a player in this node.
   * @param options player options
   */
  async createPlayer(options: PlayerOptions) {
    // Check existing players
    const existing = this.findByGuildId(options.guildId);

    if (existing) {
      return existing;
    } else {
      const player = new Player(this.link, this, options);
      await player.init();

      this.#players.set(options.guildId, player);

      return player;
    }
  }

  /**
   * Load a track using this node.
   * @param identifier the identifier
   */
  async loadTrack(identifier: string) {
    return this.#rest.loadTracks(identifier);
  }

  /**
   * Disconnect all players in this node.
   */
  async disconnectPlayers() {
    for (const player of this.#players.values()) {
      await player.disconnect();
    }
  }

  /**
   * Destroy all players in this node.
   */
  async destroyPlayers() {
    for (const player of this.#players.values()) {
      await player.deleteState();
      await this.#rest.destroyPlayer(player.guildId);
    }

    this.#players.clear();
  }

  /**
   * Destroy a player in this node.
   * @param guildId guild id
   */
  async destroyPlayer(guildId: string) {
    const player = this.findByGuildId(guildId);

    if (player) {
      await player.deleteState();

      this.#players.delete(player.guildId);
    }

    await this.#rest.destroyPlayer(guildId);
  }

  /**
   * Updates a player in this node
   * @param guildId guild id
   * @param options player update options
   */
  async updatePlayer(guildId: string, options: UpdatePlayerOptions<UserData>) {
    const player = this.findByGuildId(guildId);

    if (!player) return;

    if (options.voice) {
      logger.info('Connected to discord voice', { ...options.voice });
      player.voiceState = options.voice;
    }

    if (options.track && !player.voiceConnected) {
      logger.warn('Load track attempt while not connected to voice, delaying update...');

      setTimeout(async () => {
        if (player.voiceConnected) {
          await this.#rest.updatePlayer(guildId, options);
        } else {
          logger.error('Load track attempt failed, still not connected to discord after 5000ms');
        }
      }, 5000);
      return;
    }

    await this.#rest.updatePlayer(guildId, options);
  }
}
