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
import { RepeatMode } from './player';
import { LavalinkRestApi } from './rest';

export interface LavalinkNodeOptions {
  host: string;
  port: number;
  authorization: string;
  secure: boolean;
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
  sessionId: string | null = null;

  constructor(link: Lavalink<UserData>, options: LavalinkNodeOptions) {
    this.link = link;
    this.options = options;
    this.rest = new LavalinkRestApi(options);
  }

  get connected() {
    return this.sessionId !== undefined || this.sessionId !== null;
  }

  get authorization() {
    return this.options.authorization;
  }

  connect(userId: string) {
    const { authorization, host, port, secure } = this.options;
    const headers = {
      Authorization: authorization,
      'User-Id': userId,
      'Client-Name': 'Vivy/1.0'
    };

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

  private onWebSocketClose() {
    this.sessionId = null;
    this.rest.sessionId = null;
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
        this.handleReady(payload);
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

  private handleReady(payload: ReadyPayload) {
    this.sessionId = payload.sessionId;
    this.rest.sessionId = payload.sessionId;
    this.link.emit('nodeReady', this);
  }

  private handleStats(payload: StatsPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { op, ...stats } = payload;
    this.stats = stats;
  }

  private handlePlayerUpdate(payload: PlayerUpdatePayload) {
    const player = this.link.players.get(payload.guildId);

    if (!player) return;

    if (player.connected != payload.state.connected) {
      if (payload.state.connected) {
        this.link.emit('playerConnected', player);
      } else {
        this.link.emit('playerDisconnect', player);
        player.playing = false;
      }
    }

    player.position = payload.state.position;
    player.ping = payload.state.ping;
    player.time = payload.state.time;
    player.connected = payload.state.connected;
  }

  private async handleEvent(payload: LavalinkEventReceivePayload<UserData>) {
    const player = this.link.players.get(payload.guildId);

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
          player.playing = false;
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
        this.link.emit('playerSocketClosed', player);
        break;
      }
    }
  }

  async loadTrack(identifier: string) {
    return this.rest.loadTracks(identifier);
  }

  async destroyPlayer(guildId: string) {
    await this.rest.destroyPlayer(guildId);
  }

  async updatePlayer(guildId: string, options: UpdatePlayerOptions<UserData>) {
    await this.rest.updatePlayer(guildId, options);
  }
}
