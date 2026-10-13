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

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ListenMoe extends EventEmitter {
  private socket: WebSocket | undefined;
  private heartbeatTimerId?: NodeJS.Timeout;
  private reconnectTimerId?: NodeJS.Timeout;

  type: RadioType = RadioType.JPOP;

  info: RadioInfo = {
    song: '-',
    artist: '-',
    album: '-',
    cover: null
  };

  connect(type = RadioType.JPOP) {
    // Never leave a previous socket (or a pending reconnect) behind
    this.teardown();

    const websocketUrl = `wss://listen.moe/`;
    const socketUrl = new URL(websocketUrl);

    if (type === RadioType.JPOP) {
      socketUrl.pathname = '/gateway_v2';
    } else {
      socketUrl.pathname = '/kpop/gateway_v2';
    }

    this.type = type;
    this.socket = new WebSocket(socketUrl);
    this.socket.binaryType = 'arraybuffer';
    this.socket.addEventListener('open', this.onWebSocketOpen);
    this.socket.addEventListener('message', this.onWebSocketMessage);
    this.socket.addEventListener('close', this.onWebSocketClose);
  }

  disconnect() {
    this.teardown();
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
    this.reconnectTimerId = setTimeout(() => this.connect(this.type), 5000);
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

    logger.debug('Listen.MOE track update', { track: this.info });

    this.emit('trackUpdate');
  }
}
