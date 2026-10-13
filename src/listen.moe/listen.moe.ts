import { EventEmitter } from 'events';
import type { ListenMoeEvents } from './listen.moe.events';
import { type ListenMoePayload, PayloadType, type PlaybackInfoPayload } from './payload';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'listen.moe']);

export enum RadioType {
  JPOP,
  KPOP
}

export interface RadioInfo {
  song: string;
  artist: string;
  album: string;
  cover: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface ListenMoe {
  on<E extends keyof ListenMoeEvents>(event: E, listener: ListenMoeEvents[E]): this;
  emit<E extends keyof ListenMoeEvents>(event: E, ...args: Parameters<ListenMoeEvents[E]>): boolean;
}

export const LISTEN_MOE_JPOP_M38U = 'https://listen.moe/m3u8/jpop.m3u';
export const LISTEN_MOE_KPOP_M38U = 'https://listen.moe/m3u8/kpop.m3u';
export const LISTEN_MOE_JPOP_STREAM = 'https://listen.moe/stream';
export const LISTEN_MOE_KPOP_STREAM = 'https://listen.moe/kpop/stream';
export const LISTEN_MOE_STREAMS = [LISTEN_MOE_JPOP_STREAM, LISTEN_MOE_KPOP_STREAM];

const RECONNECT_DELAY_MS = 5000;

/**
 * The radio a stream identifier belongs to, if it is one of the Listen.MOE streams.
 */
export const radioTypeOfStream = (identifier: string | undefined): RadioType | undefined => {
  if (identifier === LISTEN_MOE_JPOP_STREAM) return RadioType.JPOP;
  if (identifier === LISTEN_MOE_KPOP_STREAM) return RadioType.KPOP;
};

const createRadioInfo = (): RadioInfo => ({
  song: '-',
  artist: '-',
  album: '-',
  cover: null
});

/**
 * A gateway connection following which song one of the radios is playing.
 */
class RadioConnection {
  readonly info: RadioInfo = createRadioInfo();

  private readonly type: RadioType;
  private readonly onUpdate: () => void;
  private active = false;
  private socket: WebSocket | undefined;
  private heartbeatTimerId?: NodeJS.Timeout;
  private reconnectTimerId?: NodeJS.Timeout;

  constructor(type: RadioType, onUpdate: () => void) {
    this.type = type;
    this.onUpdate = onUpdate;
  }

  /**
   * Starts following the radio, and keeps doing so across dropped connections until closed.
   */
  open() {
    if (this.active) return;

    this.active = true;
    this.connect();
  }

  close() {
    this.active = false;
    this.teardown();
  }

  private connect() {
    // Never leave a previous socket (or a pending reconnect) behind
    this.teardown();

    const socketUrl = new URL('wss://listen.moe/');

    socketUrl.pathname = this.type === RadioType.JPOP ? '/gateway_v2' : '/kpop/gateway_v2';

    this.socket = new WebSocket(socketUrl);
    this.socket.binaryType = 'arraybuffer';
    this.socket.addEventListener('open', this.onWebSocketOpen);
    this.socket.addEventListener('message', this.onWebSocketMessage);
    this.socket.addEventListener('close', this.onWebSocketClose);
  }

  /**
   * Stops the heartbeat and any pending reconnect, then closes the socket.
   * The listeners are detached first, so closing on purpose never triggers a reconnect.
   */
  private teardown() {
    clearInterval(this.heartbeatTimerId);
    clearTimeout(this.reconnectTimerId);

    const socket = this.socket;

    this.socket = undefined;

    if (socket) {
      socket.removeEventListener('open', this.onWebSocketOpen);
      socket.removeEventListener('message', this.onWebSocketMessage);
      socket.removeEventListener('close', this.onWebSocketClose);
      socket.close();
    }
  }

  // Handlers are arrow functions so the same reference can be added and removed
  private onWebSocketClose = () => {
    this.teardown();

    // The socket dropped on its own, reconnect to the same radio
    if (this.active) {
      this.reconnectTimerId = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    }
  };

  private onWebSocketMessage = (event: MessageEvent) => {
    const data = event.data as ArrayBuffer;
    const buffer = Buffer.from(data);
    const payload = JSON.parse(buffer.toString()) as ListenMoePayload;

    switch (payload.op) {
      case PayloadType.WELCOME:
        this.beginHeartbeat(payload.d.heartbeat);
        break;
      case PayloadType.PLAYBACK_INFO:
        this.handlePlaybackInfo(payload);
        break;
      case PayloadType.HEARTBEAT_ACK:
        break;
    }
  };

  private onWebSocketOpen = () => {
    clearInterval(this.heartbeatTimerId);
    const payload = { op: PayloadType.WELCOME, d: { auth: '' } };
    this.socket?.send(JSON.stringify(payload));
  };

  private beginHeartbeat(heartbeat: number) {
    clearInterval(this.heartbeatTimerId);
    this.heartbeatTimerId = setInterval(() => this.sendHeartbeat(), heartbeat);
  }

  private sendHeartbeat() {
    const payload = { op: PayloadType.HEARTBEAT };
    this.socket?.send(JSON.stringify(payload));
  }

  private handlePlaybackInfo(payload: PlaybackInfoPayload) {
    const data = payload.d;

    this.info.song = data.song.title;

    if (data.song.artists.length) {
      this.info.artist = data.song.artists
        .map((artist) => {
          if (artist.nameRomaji) {
            return `[${artist.nameRomaji}](https://listen.moe/artists/${artist.id})`;
          }
          return `[${artist.name}](https://listen.moe/artists/${artist.id})`;
        })
        .join(', ');
    } else {
      this.info.artist = '';
    }
    if (data.song.albums.length && data.song.albums[0]) {
      this.info.album = `[${data.song.albums[0].name}](https://listen.moe/albums/${data.song.albums[0].id})`;
    }
    if (data.song.albums && data.song.albums.length > 0 && data.song.albums[0] && data.song.albums[0].image) {
      this.info.cover = `https://cdn.listen.moe/covers/${data.song.albums[0].image}`;
    } else if (
      data.song.artists &&
      data.song.artists.length > 0 &&
      data.song.artists[0] &&
      data.song.artists[0].image
    ) {
      this.info.cover = `https://cdn.listen.moe/artists/${data.song.artists[0].image}`;
    } else {
      this.info.cover = null;
    }

    logger.debug('Listen.MOE track update', { radio: RadioType[this.type], track: this.info });

    this.onUpdate();
  }
}

/**
 * Follows what the Listen.MOE radios are playing for the guilds listening to them.
 *
 * Guilds acquire the radio they listen to and release it when they stop. A radio is only connected
 * while at least one guild listens to it, and guilds on different radios do not affect each other.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ListenMoe extends EventEmitter {
  // Kept after closing, so the last known song is there when the radio is opened again
  private readonly connections = new Map<RadioType, RadioConnection>();
  private readonly radios = new Map<string, RadioType>();

  /**
   * Starts listening to a radio for a guild. A guild listens to one radio at a time,
   * acquiring another one releases the previous.
   */
  acquire(guildId: string, type: RadioType) {
    const current = this.radios.get(guildId);

    if (current === type) return;
    if (current !== undefined) this.release(guildId, current);

    this.radios.set(guildId, type);
    this.connectionOf(type).open();
  }

  /**
   * Stops listening for a guild. When a type is given, nothing happens unless the guild is still
   * listening to that radio, so a late release can't drop the radio the guild has moved on to.
   */
  release(guildId: string, type?: RadioType) {
    const current = this.radios.get(guildId);

    if (current === undefined) return;
    if (type !== undefined && current !== type) return;

    this.radios.delete(guildId);

    const stillListened = [...this.radios.values()].includes(current);

    if (!stillListened) {
      this.connections.get(current)?.close();
    }
  }

  /**
   * The radio the guild is listening to, if any.
   */
  radioOf(guildId: string): RadioType | undefined {
    return this.radios.get(guildId);
  }

  /**
   * What the radio the guild is listening to is playing, placeholders when it is not listening.
   */
  infoOf(guildId: string): RadioInfo {
    const type = this.radios.get(guildId);
    const info = type === undefined ? undefined : this.connections.get(type)?.info;

    return info ?? createRadioInfo();
  }

  private connectionOf(type: RadioType) {
    let connection = this.connections.get(type);

    if (!connection) {
      connection = new RadioConnection(type, () => this.emit('trackUpdate', type));
      this.connections.set(type, connection);
    }

    return connection;
  }
}
