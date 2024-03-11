interface Artist {
  id: number;
  name: string;
  nameRomaji: string | null;
  image: string;
}

interface Album {
  id: number;
  name: string;
  nameRomaji: string | null;
  image: string | null;
}

interface Song {
  id: number;
  title: string;
  sources: string[];
  artists: Artist[];
  albums: Album[];
  duration: number;
  favorite: boolean;
}

interface TrackUpdateData {
  song: Song;
  requester: string | null;
  event: string | null;
  startTime: Date;
  lastPlayed: Song[];
  listeners: number;
}

export enum PayloadType {
  WELCOME = 0,
  PLAYBACK_INFO = 1,
  HEARTBEAT = 9,
  HEARTBEAT_ACK = 10
}

export enum PlaybackInfoType {
  TRACK_UPDATE = 'TRACK_UPDATE',
  TRACK_UPDATE_REQUEST = 'TRACK_UPDATE_REQUEST'
}

interface Payload {
  op: PayloadType;
  t?: PlaybackInfoType;
}

interface HeartbeatPayload extends Payload {
  op: PayloadType.HEARTBEAT;
}

interface HeartbeatAckPayload extends Payload {
  op: PayloadType.HEARTBEAT_ACK;
}

interface WelcomePayload extends Payload {
  op: PayloadType.WELCOME;
  d: {
    message: string;
    heartbeat: number;
  };
}

interface TrackUpdatePayload extends Payload {
  op: PayloadType.PLAYBACK_INFO;
  t: PlaybackInfoType.TRACK_UPDATE;
  d: TrackUpdateData;
}

interface TrackUpdateRequestPayload extends Payload {
  op: PayloadType.PLAYBACK_INFO;
  t: PlaybackInfoType.TRACK_UPDATE_REQUEST;
  d: TrackUpdateData;
}

export type ListenMoePayload =
  | HeartbeatPayload
  | WelcomePayload
  | HeartbeatAckPayload
  | TrackUpdatePayload
  | TrackUpdateRequestPayload;

export type PlaybackInfoPayload = TrackUpdatePayload | TrackUpdateRequestPayload;
