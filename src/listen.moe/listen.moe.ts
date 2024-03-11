import WebSocket from 'ws';
import { ListenMoePayload, PayloadType, PlaybackInfoPayload } from './payload';
import { EventEmitter } from 'events';
import { ListenMoeEvents } from './listen.moe.events';
import { logger } from '@app/logger';

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
  private socket: WebSocket | null = null;
  private heartbeatTimerId?: NodeJS.Timeout;

  info: RadioInfo = {
    song: '-',
    artist: '-',
    album: '-',
    cover: null
  };

  connect(type = RadioType.JPOP) {
    const websocketUrl = `wss://listen.moe/`;
    const socketUrl = new URL(websocketUrl);

    if (type === RadioType.JPOP) {
      socketUrl.pathname = '/gateway_v2';
    } else {
      socketUrl.pathname = '/kpop/gateway_v2';
    }

    this.socket = new WebSocket(socketUrl);
    this.socket.on('open', this.onWebSocketOpen.bind(this));
    this.socket.on('message', this.onWebSocketMessage.bind(this));
    this.socket.on('close', this.onWebSocketClose.bind(this));
  }

  disconnect() {
    if (this.socket) {
      clearInterval(this.heartbeatTimerId);
      this.socket.removeAllListeners();
      this.socket.close();
    }
  }

  private onWebSocketClose() {
    clearInterval(this.heartbeatTimerId);
    this.socket!.removeAllListeners();
    // Reconnect
    setTimeout(() => this.connect(), 5000);
  }

  private onWebSocketMessage(data: WebSocket.RawData) {
    const buffer = Array.isArray(data) ? Buffer.concat(data) : data instanceof ArrayBuffer ? Buffer.from(data) : data;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const payload: ListenMoePayload = JSON.parse(buffer.toString());

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
  }

  private onWebSocketOpen() {
    clearInterval(this.heartbeatTimerId);
    const payload = { op: PayloadType.WELCOME, d: { auth: '' } };
    this.socket!.send(JSON.stringify(payload));
  }

  private beginHeartbeat(heartbeat: number) {
    setTimeout(() => this.sendHeartbeat(), heartbeat);
  }

  private sendHeartbeat() {
    const payload = { op: PayloadType.HEARTBEAT };
    this.socket!.send(JSON.stringify(payload));
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
    if (data.song.albums.length) {
      this.info.album = `[${data.song.albums[0].name}](https://listen.moe/albums/${data.song.albums[0].id})`;
    }
    if (data.song.albums && data.song.albums.length > 0 && data.song.albums[0].image) {
      this.info.cover = `https://cdn.listen.moe/covers/${data.song.albums[0].image}`;
    } else {
      this.info.cover = null;
    }

    logger.info('Listen.MOE track update', { track: this.info });

    this.emit('trackUpdate');
  }
}
