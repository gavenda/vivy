import type { AppContext } from 'vivy/context';
import type { Player, Track } from 'vivy/link';
import type { Requester } from 'vivy/requester';
import { REMOTE_QUEUE_LIMIT, type RemoteGuildState, type RemoteSearchTrack, type RemoteTrack } from './contract';

/** The voice channel Vivy is in, as Discord sees it. The player's own idea can be stale after a kick. */
export const currentVoiceChannelId = (context: AppContext, guildId: string): string | null =>
  context.client.guilds.cache.get(guildId)?.members.me?.voice.channelId ?? null;

export const toRemoteTrack = (context: AppContext, track: Track<Requester>): RemoteTrack => {
  const { info, userData } = track;
  // Autoplay queues tracks in Vivy's own name
  const requested = userData?.userId && userData.userId !== context.applicationId;

  return {
    identifier: info.identifier,
    title: info.title,
    author: info.author,
    lengthMs: info.length,
    isStream: info.isStream,
    isSeekable: info.isSeekable && !info.isStream,
    uri: info.uri ?? null,
    artworkUrl: info.artworkUrl ?? null,
    requester: requested ? { id: userData.userId, name: userData.userName } : null
  };
};

export const toSearchTrack = (
  context: AppContext,
  track: Track<Requester> & { encoded: string }
): RemoteSearchTrack => ({
  ...toRemoteTrack(context, track),
  encoded: track.encoded
});

export const idleState = (guildId: string, voiceChannelId: string | null = null): RemoteGuildState => ({
  guildId,
  voiceChannelId,
  paused: false,
  current: null,
  positionMs: 0,
  positionAt: Date.now(),
  rate: 1,
  queue: [],
  queueSize: 0,
  durationMs: 0,
  volume: 1,
  repeat: 'off'
});

export const toGuildState = (context: AppContext, guildId: string): RemoteGuildState => {
  const player: Player<Requester> | undefined = context.link.findPlayerByGuildId(guildId);
  const voiceChannelId = currentVoiceChannelId(context, guildId);

  if (!player) return idleState(guildId, voiceChannelId);

  const { queue } = player;
  const current = queue.current;

  return {
    guildId,
    voiceChannelId,
    paused: Boolean(current) && !player.playing,
    current: current ? toRemoteTrack(context, current) : null,
    positionMs: current ? Math.min(player.currentPosition, current.info.isStream ? Infinity : current.info.length) : 0,
    positionAt: Date.now(),
    rate: player.rate,
    queue: queue
      .toArray()
      .slice(0, REMOTE_QUEUE_LIMIT)
      .map((track) => toRemoteTrack(context, track)),
    queueSize: queue.size,
    durationMs: queue.duration,
    volume: player.volume,
    repeat: player.repeatMode
  };
};
