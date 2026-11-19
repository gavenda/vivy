import type { Guild } from 'discord.js';
import type { AppContext } from 'vivy/context';
import { LavalinkSource, LoadResultType, type LavalinkTrackLoadResult, type Player, type Track } from 'vivy/link';
import { enqueueTracks, QueueType, refreshPlayer, searchWithRetry } from 'vivy/player';
import type { Requester } from 'vivy/requester';
import { sleep } from 'vivy/utils';
import { isSpotify } from 'vivy/utils/is-spotify';
import { REMOTE_SEARCH_LIMIT, type RemoteOp, type RemoteOps, type RemoteSource } from './contract';
import { RemoteFailure } from './errors';
import { currentVoiceChannelId, idleState, toGuildState, toRemoteTrack, toSearchTrack } from './serialize';

type Handler<Op extends RemoteOp> = (
  context: AppContext,
  params: RemoteOps[Op]['params']
) => Promise<RemoteOps[Op]['result']>;

export type RemoteHandlers = { [Op in RemoteOp]: Handler<Op> };

const MAX_QUERY_LENGTH = 512;
const MAX_ENCODED_LENGTH = 4096;

const QUEUE_TYPES: Record<RemoteOps['play']['params']['queueType'], QueueType> = {
  now: QueueType.NOW,
  next: QueueType.NEXT,
  later: QueueType.LATER
};

const SOURCES: Record<RemoteSource, LavalinkSource> = {
  ytmsearch: LavalinkSource.YOUTUBE_MUSIC,
  ytsearch: LavalinkSource.YOUTUBE
};

const toSource = (source: unknown): LavalinkSource => {
  if (source === undefined) return LavalinkSource.YOUTUBE_MUSIC;
  if (typeof source === 'string' && source in SOURCES) return SOURCES[source as RemoteSource];

  throw new RemoteFailure('BAD_REQUEST', `Unknown source ${JSON.stringify(source)}`);
};

const requireString = (value: unknown, name: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new RemoteFailure('BAD_REQUEST', `${name} must be a string of 1 to ${maxLength} characters`);
  }

  return value.trim();
};

const requireGuild = (context: AppContext, guildId: unknown): Guild => {
  const guild = typeof guildId === 'string' ? context.client.guilds.cache.get(guildId) : undefined;

  if (!guild) throw new RemoteFailure('GUILD_NOT_FOUND', `Not in guild ${String(guildId)}`);

  return guild;
};

const requireVoiceChannel = (guild: Guild, channelId: unknown) => {
  const channel = typeof channelId === 'string' ? guild.channels.cache.get(channelId) : undefined;

  if (!channel?.isVoiceBased()) {
    throw new RemoteFailure('CHANNEL_NOT_FOUND', `No voice channel ${String(channelId)}`);
  }
  // A full channel Vivy is already in is fine, she isn't joining it
  const inChannel = guild.members.me?.voice.channelId === channel.id;

  if (!inChannel && (!channel.joinable || channel.full)) {
    throw new RemoteFailure('VOICE_NOT_JOINABLE', `Can't join ${channel.id}`);
  }

  return channel;
};

/** Fails before anything else happens when Lavalink is down, rather than halfway through. */
const requireNode = (context: AppContext) => {
  try {
    return context.link.availableNode;
  } catch (error) {
    throw new RemoteFailure('NODE_UNAVAILABLE', error instanceof Error ? error.message : 'No nodes connected');
  }
};

const requirePlayer = (context: AppContext, guildId: string): Player<Requester> => {
  requireGuild(context, guildId);
  requireNode(context);

  const player = context.link.findPlayerByGuildId(guildId);

  if (!player || !currentVoiceChannelId(context, guildId)) {
    throw new RemoteFailure('NOT_CONNECTED', `Not in voice in ${guildId}`);
  }

  return player;
};

const requireCurrent = (context: AppContext, guildId: string) => {
  const player = requirePlayer(context, guildId);

  if (!player.queue.current) throw new RemoteFailure('NOTHING_PLAYING', `Nothing playing in ${guildId}`);

  return player;
};

const toRequester = (requester: unknown): Requester => {
  const { id, name } = (requester ?? {}) as Partial<Record<'id' | 'name', unknown>>;

  return {
    userId: requireString(id, 'requester.id', 32),
    userName: requireString(name, 'requester.name', 100),
    // Asked for from the dashboard, there is no text channel to answer in
    textChannelId: ''
  };
};

/** What a load found, or LOAD_FAILED when Lavalink couldn't load it. */
const loadedTracks = (
  result: LavalinkTrackLoadResult<Requester>
): { tracks: Track<Requester>[]; playlistName: string | null } => {
  switch (result.loadType) {
    case LoadResultType.TRACK:
      return { tracks: [result.data], playlistName: null };
    case LoadResultType.SEARCH:
      return { tracks: result.data, playlistName: null };
    case LoadResultType.PLAYLIST:
      return { tracks: result.data.tracks, playlistName: result.data.info.name };
    case LoadResultType.EMPTY:
      return { tracks: [], playlistName: null };
    case LoadResultType.ERROR:
      throw new RemoteFailure('LOAD_FAILED', result.data.message ?? 'Unable to load the query');
  }
};

const resolveTracks = async (
  context: AppContext,
  target: RemoteOps['play']['params']['target'],
  userData: Requester
): Promise<{ tracks: Track<Requester>[]; playlistName: string | null }> => {
  const { link } = context;

  if ('encoded' in target) {
    const track = await link.decodeTrack(requireString(target.encoded, 'encoded', MAX_ENCODED_LENGTH), userData);

    if (!track) throw new RemoteFailure('INVALID_TRACK', `Can't decode the track`);

    return { tracks: [track], playlistName: null };
  }

  const query = requireString(target.query, 'query', MAX_QUERY_LENGTH);

  if (isSpotify(query)) throw new RemoteFailure('UNSUPPORTED_QUERY', `Spotify links can't be queued remotely`);

  const result = await searchWithRetry(link, { query, source: toSource(target.source), userData });
  const loaded = loadedTracks(result);

  // Nobody to pick from, take the best match
  return result.loadType === LoadResultType.SEARCH ? { ...loaded, tracks: loaded.tracks.slice(0, 1) } : loaded;
};

/** Joins the channel, or moves there when already in voice. */
const joinVoice = async (player: Player<Requester>, voiceChannelId: string) => {
  if (player.voiceConnected) {
    await player.move(voiceChannelId);
  } else {
    await player.connect(voiceChannelId);
  }
};

const MOVE_CONFIRM_MS = 3000;
const MOVE_POLL_MS = 100;

/**
 * Waits until Discord says Vivy is in the channel, so a request right after a move (playing there) sees her there.
 * Gives up quietly after a few seconds, the state that follows shows wherever she ended up.
 */
const waitForVoice = async (context: AppContext, guildId: string, voiceChannelId: string) => {
  const deadline = Date.now() + MOVE_CONFIRM_MS;

  while (currentVoiceChannelId(context, guildId) !== voiceChannelId && Date.now() < deadline) {
    await sleep(MOVE_POLL_MS);
  }
};

/**
 * Re-renders the player embed. Not awaited: the embed update is debounced by a second, which the answer to Plana
 * shouldn't wait for.
 */
const refreshEmbed = (context: AppContext, guildId: string) => void refreshPlayer(context, guildId);

/** Carries out a change on the player, then refreshes the player embed and answers with the state it left. */
const control =
  (guard: typeof requirePlayer, change: (player: Player<Requester>) => unknown) =>
  async (context: AppContext, { guildId }: { guildId: string }) => {
    await change(guard(context, guildId));
    refreshEmbed(context, guildId);

    return toGuildState(context, guildId);
  };

export const remoteHandlers: RemoteHandlers = {
  search: async (context, { query, source }) => {
    requireNode(context);

    // Not searchWithRetry: someone is waiting on the results as they type, a second search follows soon enough
    const result = await context.link.search({
      query: requireString(query, 'query', MAX_QUERY_LENGTH),
      source: toSource(source),
      // Only returned to Plana, play stamps the real requester when the result is queued
      userData: { userId: '', userName: '', textChannelId: '' }
    });
    const { tracks, playlistName } = loadedTracks(result);

    return {
      tracks: tracks
        .filter((track): track is Track<Requester> & { encoded: string } => Boolean(track.encoded))
        .slice(0, REMOTE_SEARCH_LIMIT)
        .map((track) => toSearchTrack(context, track)),
      playlistName
    };
  },

  play: async (context, { guildId, voiceChannelId, requester, queueType, target }) => {
    const { link } = context;
    const guild = requireGuild(context, guildId);
    const channel = requireVoiceChannel(guild, voiceChannelId);
    const type = QUEUE_TYPES[queueType];

    if (!type) throw new RemoteFailure('BAD_REQUEST', `Unknown queue type ${String(queueType)}`);
    if (typeof target !== 'object' || target === null) throw new RemoteFailure('BAD_REQUEST', 'target is required');

    requireNode(context);

    // Look up first, so a query that finds nothing doesn't leave Vivy sitting in the channel
    const { tracks, playlistName } = await resolveTracks(context, target, toRequester(requester));

    if (tracks.length === 0) throw new RemoteFailure('NO_RESULTS', 'Nothing found');

    const player = await link.createPlayer({ guildId, autoLeave: true });
    const inVoice = currentVoiceChannelId(context, guildId);

    if (!inVoice && player.voiceConnected) {
      // Kicked from voice, the player still thinks it's in the channel
      player.voiceChannelId = undefined;
      player.clearVoiceSession();
    }

    if (inVoice !== channel.id) {
      if (inVoice && (player.queue.current || !player.queue.isEmpty)) {
        throw new RemoteFailure('WRONG_VOICE_CHANNEL', `Playing in ${inVoice}`, { voiceChannelId: inVoice });
      }

      await joinVoice(player, channel.id);
    }

    await enqueueTracks(player, tracks, type);
    refreshEmbed(context, guildId);

    const [first] = tracks;

    return {
      added: tracks.length,
      first: first ? toRemoteTrack(context, first) : null,
      playlistName,
      state: toGuildState(context, guildId)
    };
  },

  pause: control(requireCurrent, (player) => player.pause()),
  resume: control(requireCurrent, (player) => player.resume()),
  skip: control(requireCurrent, (player) => player.skip()),
  clear: control(requirePlayer, (player) => player.queue.clear()),
  shuffle: control(requirePlayer, (player) => player.queue.shuffle()),

  stop: async (context, { guildId }) => {
    const player = requirePlayer(context, guildId);

    await player.queue.clear();
    await player.stop();
    await player.disconnect();
    await player.destroy();
    refreshEmbed(context, guildId);

    // Discord hasn't confirmed leaving yet, the state would still show the channel
    return idleState(guildId);
  },

  // eslint-disable-next-line @typescript-eslint/require-await -- every handler answers with a promise
  remove: async (context, { guildId, index, identifier }) => {
    const player = requirePlayer(context, guildId);

    if (!Number.isInteger(index) || index < 0 || index >= player.queue.size) {
      throw new RemoteFailure('INDEX_OUT_OF_RANGE', `No track at ${String(index)}`);
    }

    const track = player.queue.peek(index);

    if (identifier !== undefined && track?.info.identifier !== identifier) {
      throw new RemoteFailure('STALE_INDEX', `The queue changed`);
    }

    player.queue.removeAt(index);
    refreshEmbed(context, guildId);

    return toGuildState(context, guildId);
  },

  seek: async (context, { guildId, positionMs }) => {
    const player = requireCurrent(context, guildId);
    const { info } = player.queue.current!;

    if (!info.isSeekable || info.isStream) throw new RemoteFailure('NOT_SEEKABLE', `Can't seek ${info.identifier}`);
    if (typeof positionMs !== 'number' || !Number.isFinite(positionMs)) {
      throw new RemoteFailure('BAD_REQUEST', 'positionMs must be a number');
    }

    const position = Math.round(Math.min(Math.max(positionMs, 0), info.length));

    await player.update({ position });
    // Lavalink reports the new position with its next player update, the state answered now shouldn't wait for it
    player.setPosition(position);
    refreshEmbed(context, guildId);

    return toGuildState(context, guildId);
  },

  move: async (context, { guildId, voiceChannelId }) => {
    const channel = requireVoiceChannel(requireGuild(context, guildId), voiceChannelId);
    const player = requirePlayer(context, guildId);

    await joinVoice(player, channel.id);
    await waitForVoice(context, guildId, channel.id);

    return toGuildState(context, guildId);
  },

  // eslint-disable-next-line @typescript-eslint/require-await -- every handler answers with a promise
  state: async (context, { guildId }) => {
    requireGuild(context, guildId);

    return toGuildState(context, guildId);
  }
};
