/**
 * The remote control contract between Vivy and Plana, the server's admin bot, which commands Vivy from its dashboard
 * over the Redis both share. Plana keeps a copy of this file as `src/server/vivy-contract.ts` (Vivy's is
 * `src/remote/contract.ts`): change both together, and keep it free of imports so it can be copied as is, each
 * app's formatter aside.
 *
 * Plana publishes a {@link RemoteRequest} on {@link RemoteChannel.request} and waits for the {@link RemoteResponse}
 * with the same id on {@link RemoteChannel.response}. Publishing reaches nobody when Vivy is offline, which Plana sees
 * as a subscriber count of 0. Vivy also publishes a {@link RemoteEvent} on {@link RemoteChannel.event} whenever a
 * guild's player changes, and the position of a playing track every few seconds.
 */

export const REMOTE_PROTOCOL_VERSION = 1;

export const RemoteChannel = {
  /** Plana to Vivy. */
  request: 'vivy:remote:request',
  /** Vivy to Plana, matched to the request by id. */
  response: 'vivy:remote:response',
  /** Vivy to Plana, the live state of a guild's player. */
  event: 'vivy:remote:event'
} as const;

/** Larger messages are dropped on receipt. */
export const REMOTE_MAX_MESSAGE_BYTES = 65536;
/** At most this many upcoming tracks are sent in a state, `queueSize` has the full count. */
export const REMOTE_QUEUE_LIMIT = 100;
/** At most this many search results are returned. */
export const REMOTE_SEARCH_LIMIT = 10;

export type RemoteQueueType = 'now' | 'next' | 'later';
export type RemoteSource = 'ytmsearch' | 'ytsearch';
export type RemoteRepeat = 'off' | 'track' | 'queue';

export interface RemoteRequester {
  id: string;
  name: string;
}

/** A track as shown in a queue. */
export interface RemoteTrack {
  identifier: string;
  title: string;
  author: string;
  lengthMs: number;
  isStream: boolean;
  uri: string | null;
  artworkUrl: string | null;
  /** Who asked for it, null when Vivy queued it on its own (autoplay, radio). */
  requester: RemoteRequester | null;
}

/** A search result, pass `encoded` back to `play` to queue it without searching again. */
export interface RemoteSearchTrack extends RemoteTrack {
  encoded: string;
}

export interface RemoteGuildState {
  guildId: string;
  /** The voice channel Vivy is in, null when not in one. */
  voiceChannelId: string | null;
  /** A track is loaded and paused. */
  paused: boolean;
  current: RemoteTrack | null;
  /**
   * Position in `current` at `positionAt`, epoch ms by Vivy's clock (Vivy and Plana share a host). While playing,
   * the position later is `positionMs + (Date.now() - positionAt)`, capped at the track's length.
   */
  positionMs: number;
  positionAt: number;
  /** How fast the position moves against the clock: 1, or faster or slower under a speed filter (nightcore). */
  rate: number;
  /** The upcoming tracks, `current` excluded, the first {@link REMOTE_QUEUE_LIMIT} of them. */
  queue: RemoteTrack[];
  queueSize: number;
  /** Length of `current` and the queue, streams excluded. */
  durationMs: number;
  /** 0 to 1. */
  volume: number;
  repeat: RemoteRepeat;
}

export interface RemoteOps {
  /** A search, or a link to a track or playlist. */
  search: {
    params: { query: string; source?: RemoteSource };
    result: { tracks: RemoteSearchTrack[]; playlistName: string | null };
  };
  /**
   * Queues a search result (`encoded`) or the first match of a query, which may be a link to a track or a playlist.
   * Fails with WRONG_VOICE_CHANNEL while Vivy plays in another channel, use `move` first.
   */
  play: {
    params: {
      guildId: string;
      voiceChannelId: string;
      requester: RemoteRequester;
      queueType: RemoteQueueType;
      target: { encoded: string } | { query: string; source?: RemoteSource };
    };
    result: { added: number; first: RemoteTrack | null; playlistName: string | null; state: RemoteGuildState };
  };
  pause: { params: { guildId: string }; result: RemoteGuildState };
  resume: { params: { guildId: string }; result: RemoteGuildState };
  skip: { params: { guildId: string }; result: RemoteGuildState };
  /** Clears the queue, stops and leaves voice. */
  stop: { params: { guildId: string }; result: RemoteGuildState };
  clear: { params: { guildId: string }; result: RemoteGuildState };
  shuffle: { params: { guildId: string }; result: RemoteGuildState };
  /**
   * Removes an upcoming track, `index` counting from 0 in {@link RemoteGuildState.queue}. With `identifier`, fails
   * with STALE_INDEX instead of removing another track when the queue changed meanwhile.
   */
  remove: { params: { guildId: string; index: number; identifier?: string }; result: RemoteGuildState };
  /** Moves Vivy to another voice channel. */
  move: { params: { guildId: string; voiceChannelId: string }; result: RemoteGuildState };
  state: { params: { guildId: string }; result: RemoteGuildState };
}

export type RemoteOp = keyof RemoteOps;

export const REMOTE_OPS = [
  'search',
  'play',
  'pause',
  'resume',
  'skip',
  'stop',
  'clear',
  'shuffle',
  'remove',
  'move',
  'state'
] as const satisfies readonly RemoteOp[];

export type RemoteRequest<Op extends RemoteOp = RemoteOp> = {
  [O in Op]: {
    v: typeof REMOTE_PROTOCOL_VERSION;
    /** Unique per request. */
    id: string;
    op: O;
    /** Epoch ms. Vivy drops a request older than `timeoutMs`, which Plana has given up on. */
    sentAt: number;
    timeoutMs: number;
    params: RemoteOps[O]['params'];
  };
}[Op];

export type RemoteErrorCode =
  | 'BAD_REQUEST'
  | 'EXPIRED'
  | 'UNSUPPORTED_QUERY'
  | 'INVALID_TRACK'
  | 'GUILD_NOT_FOUND'
  | 'CHANNEL_NOT_FOUND'
  | 'VOICE_NOT_JOINABLE'
  | 'NODE_UNAVAILABLE'
  | 'NOT_CONNECTED'
  | 'NOTHING_PLAYING'
  | 'WRONG_VOICE_CHANNEL'
  | 'INDEX_OUT_OF_RANGE'
  | 'STALE_INDEX'
  | 'NO_RESULTS'
  | 'LOAD_FAILED'
  | 'INTERNAL';

export interface RemoteError {
  code: RemoteErrorCode;
  /** For logs, not for display. */
  message: string;
  /** WRONG_VOICE_CHANNEL has `voiceChannelId`, the channel Vivy is in. */
  details?: Record<string, string>;
}

export type RemoteResponse<Op extends RemoteOp = RemoteOp> =
  | { v: typeof REMOTE_PROTOCOL_VERSION; id: string; ok: true; result: RemoteOps[Op]['result'] }
  | { v: typeof REMOTE_PROTOCOL_VERSION; id: string; ok: false; error: RemoteError };

export type RemoteEvent =
  /** A guild's player changed. `seq` grows per `instanceId`, a lower one from the same instance is stale. */
  | {
      v: typeof REMOTE_PROTOCOL_VERSION;
      type: 'state';
      instanceId: string;
      seq: number;
      state: RemoteGuildState;
    }
  /**
   * Where a playing track is, as Lavalink reports it every few seconds (its `playerUpdateInterval`), to correct a
   * position counted forward since the last state. `seq` is shared with `state`. `identifier` is the track's, drop a
   * progress for a track other than the state's current one.
   */
  | {
      v: typeof REMOTE_PROTOCOL_VERSION;
      type: 'progress';
      instanceId: string;
      seq: number;
      guildId: string;
      identifier: string;
      paused: boolean;
      /** As in {@link RemoteGuildState}. */
      positionMs: number;
      positionAt: number;
      rate: number;
    }
  /** Vivy started listening, request the state again. */
  | { v: typeof REMOTE_PROTOCOL_VERSION; type: 'ready'; instanceId: string }
  /** Vivy is shutting down. */
  | { v: typeof REMOTE_PROTOCOL_VERSION; type: 'shutdown'; instanceId: string };
