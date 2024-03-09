import { Track } from './track';

export enum OpCode {
  READY = 'ready',
  PLAYER_UPDATE = 'playerUpdate',
  STATS = 'stats',
  EVENT = 'event'
}

export enum EventType {
  TRACK_START = 'TrackStartEvent',
  TRACK_END = 'TrackEndEvent',
  TRACK_EXCEPTION = 'TrackExceptionEvent',
  TRACK_STUCK = 'TrackStuckEvent',
  WEBSOCKET_CLOSED = 'WebSocketClosedEvent'
}

export type TrackEndReason = 'finished' | 'loadFailed' | 'stopped' | 'replaced' | 'cleanup';

export type Severity = 'common' | 'suspicious' | 'fault';
export interface Exception {
  severity: Severity;
  message: string;
  cause: string;
}

export interface LinkPlayerState {
  time: number;
  position: number;
  connected: boolean;
  ping: number;
}

export interface Stats {
  players: number;
  playingPlayers: number;
  uptime: number;
  memory: Memory;
  cpu: CPU;
  frameStats?: FrameStats;
}

export interface Memory {
  free: number;
  used: number;
  allocated: number;
  reservable: number;
}

export interface CPU {
  cores: number;
  systemLoad: number;
  lavalinkLoad: number;
}

export interface FrameStats {
  sent: number;
  nulled: number;
  deficit: number;
}

export interface Payload {
  op: OpCode;
}

export interface ReadyPayload extends Payload {
  op: OpCode.READY;
  resumed: boolean;
  sessionId: string;
}

export interface PlayerUpdatePayload extends Payload {
  op: OpCode.PLAYER_UPDATE;
  guildId: string;
  state: LinkPlayerState;
}

export interface StatsPayload extends Stats, Payload {
  op: OpCode.STATS;
}

export interface TrackStartEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  guildId: string;
  type: EventType.TRACK_START;
  track: Track<UserData>;
}

export interface TrackEndEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  guildId: string;
  type: EventType.TRACK_END;
  track: Track<UserData>;
  reason: TrackEndReason;
}

export interface TrackExceptionEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  guildId: string;
  type: EventType.TRACK_EXCEPTION;
  track: Track<UserData>;
  exception: Exception;
  error: string;
}

export interface TrackStuckEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  guildId: string;
  type: EventType.TRACK_STUCK;
  track: Track<UserData>;
  thresholdMs: number;
}

export interface WebSocketClosedEvent extends Payload {
  op: OpCode.EVENT;
  guildId: string;
  type: EventType.WEBSOCKET_CLOSED;
  code: number;
  byRemote: boolean;
  reason: string;
}

export type LavalinkReceivePayload<UserData> =
  | ReadyPayload
  | PlayerUpdatePayload
  | StatsPayload
  | TrackStartEvent<UserData>
  | TrackEndEvent<UserData>
  | TrackExceptionEvent<UserData>
  | TrackStuckEvent<UserData>
  | WebSocketClosedEvent;

export type LavalinkEventReceivePayload<UserData> =
  | TrackStartEvent<UserData>
  | TrackEndEvent<UserData>
  | TrackExceptionEvent<UserData>
  | TrackStuckEvent<UserData>
  | WebSocketClosedEvent;
