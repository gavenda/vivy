import { Track } from './track';

export enum OpCode {
  /**
   * Dispatched when you successfully connect to the Lavalink node.
   */
  READY = 'ready',
  /**
   * Dispatched every x seconds with the latest player state.
   */
  PLAYER_UPDATE = 'playerUpdate',
  /**
   * Dispatched when the node sends stats once per minute.
   */
  STATS = 'stats',
  /**
   * Dispatched when player or voice events occur.
   */
  EVENT = 'event'
}

export enum EventType {
  /**
   * Dispatched when a track starts playing.
   */
  TRACK_START = 'TrackStartEvent',
  /**
   * Dispatched when a track ends.s
   */
  TRACK_END = 'TrackEndEvent',
  /**
   * Dispatched when a track throws an exception.
   */
  TRACK_EXCEPTION = 'TrackExceptionEvent',
  /**
   * Dispatched when a track gets stuck while playing.
   */
  TRACK_STUCK = 'TrackStuckEvent',
  /**
   * Dispatched when the websocket connection to Discord voice servers is closed.
   */
  WEBSOCKET_CLOSED = 'WebSocketClosedEvent'
}

export enum TrackEndReason {
  /**
   * The track finished playing.
   */
  FINISHED = 'finished',
  /**
   * The track failed to load.
   */
  LOAD_FAILED = 'loadFailed',
  /**
   * The track was stopped.
   */
  STOPPED = 'stopped',
  /**
   * The track was replaced.
   */
  REPLACED = 'replaced',
  /**
   * The track was cleaned up.
   */
  CLEANUP = 'cleanup'
}

export enum Severity {
  /**
   * The cause is known and expected, indicates that there is nothing wrong with the library itself.
   */
  COMMON = 'common',
  /**
   * The cause might not be exactly known, but is possibly caused by outside factors.
   *
   * For example when an outside service responds in a format that we do not expect.
   */
  SUSPICOUS = 'suspicious',
  /**
   * The probable cause is an issue with the library or there is no way to tell what the cause might be.
   *
   * This is the default level and other levels are used in cases where the thrower has more in-depth knowledge about the error.
   */
  FAULT = 'fault'
}
export interface Exception {
  /**
   * 	The message of the exception.
   */
  message: string;
  /**
   * The severity of the exception.
   */
  severity: Severity;
  /**
   * The cause of the exception.
   */
  cause: string;
}

export interface LinkPlayerState {
  /**
   * Unix timestamp in milliseconds.
   */
  time: number;
  /**
   * The position of the track in milliseconds.
   */
  position: number;
  /**
   * Whether Lavalink is connected to the voice gateway.
   */
  connected: boolean;
  /**
   * The ping of the node to the Discord voice server in milliseconds (-1 if not connected).
   */
  ping: number;
}

export interface Stats {
  /**
   * The amount of players connected to the node.
   */
  players: number;
  /**
   * The amount of players playing a track.
   */
  playingPlayers: number;
  /**
   * The uptime of the node in milliseconds.
   */
  uptime: number;
  /**
   * The memory stats of the node.
   */
  memory: Memory;
  /**
   * The cpu stats of the node.
   */
  cpu: CPU;
  /**
   * The frame stats of the node. `null` if the node has no players or when retrieved via {@link https://lavalink.dev/api/rest#get-lavalink-stats | Get Lavalink Stats}
   */
  frameStats?: FrameStats;
}

export interface Memory {
  /**
   * The amount of free memory in bytes.
   */
  free: number;
  /**
   * The amount of used memory in bytes.
   */
  used: number;
  /**
   * The amount of allocated memory in bytes.
   */
  allocated: number;
  /**
   * The amount of reservable memory in bytes.
   */
  reservable: number;
}

export interface CPU {
  /**
   * The amount of cores the node has.
   */
  cores: number;
  /**
   * The system load of the node.
   */
  systemLoad: number;
  /**
   * The load of Lavalink on the node.
   */
  lavalinkLoad: number;
}

export interface FrameStats {
  /**
   * The amount of frames sent to Discord.
   */
  sent: number;
  /**
   * The amount of frames that were nulled.
   */
  nulled: number;
  /**
   * The difference between sent frames and the expected amount of frames.
   */
  deficit: number;
}

export interface Payload {
  op: OpCode;
}

export interface ReadyPayload extends Payload {
  op: OpCode.READY;
  /**
   * Whether this session was resumed.
   */
  resumed: boolean;
  /**
   * The Lavalink session id of this connection.
   *
   * Not to be confused with a Discord voice session id
   */
  sessionId: string;
}

export interface PlayerUpdatePayload extends Payload {
  op: OpCode.PLAYER_UPDATE;
  /**
   * The guild id of the player.
   */
  guildId: string;
  /**
   * The player state.
   */
  state: LinkPlayerState;
}

export interface StatsPayload extends Stats, Payload {
  op: OpCode.STATS;
}

export interface TrackStartEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  type: EventType.TRACK_START;
  /**
   * The guild id.
   */
  guildId: string;
  /**
   * The track that started playing.
   */
  track: Track<UserData>;
}

export interface TrackEndEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  type: EventType.TRACK_END;
  /**
   * The guild id.
   */
  guildId: string;
  /**
   * The track that ended playing.
   */
  track: Track<UserData>;
  /**
   * The reason the track ended.
   */
  reason: TrackEndReason;
}

export interface TrackExceptionEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  type: EventType.TRACK_EXCEPTION;
  /**
   * The guild id.
   */
  guildId: string;
  /**
   * The track that threw the exception.
   */
  track: Track<UserData>;
  /**
   * The occurred exception.
   */
  exception: Exception;
}

export interface TrackStuckEvent<UserData> extends Payload {
  op: OpCode.EVENT;
  type: EventType.TRACK_STUCK;
  /**
   * The guild id.
   */
  guildId: string;
  /**
   * The track that got stuck.
   */
  track: Track<UserData>;
  /**
   * The threshold in milliseconds that was exceeded.
   */
  thresholdMs: number;
}

export interface WebSocketClosedEvent extends Payload {
  op: OpCode.EVENT;
  type: EventType.WEBSOCKET_CLOSED;
  /**
   * The guild id.
   */
  guildId: string;
  /**
   * The Discord close event code.
   */
  code: number;
  /**
   * Whether the connection was closed by Discord.
   */
  reason: string;
  /**
   * The close reason.
   */
  byRemote: boolean;
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
