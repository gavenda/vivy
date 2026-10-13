import { getLogger } from '@logtape/logtape';
import type { AppContext } from './context';
import { getContextualEncore, isAutoplayEnabled } from './diva';
import { LoadResultType, RepeatMode, type Player, type Track } from './link';
import { LISTEN_MOE_STREAMS } from './listen.moe';
import type { Requester } from './requester';

const logger = getLogger(['vivy', 'autoplay']);

/**
 * Whether the track was queued by autoplay rather than requested by a user.
 */
export const isAutoplayTrack = (context: AppContext, track: Track<Requester>) =>
  track.userData.userId === context.applicationId;

const hasListeners = (context: AppContext, guildId: string, voiceChannelId: string) => {
  const channel = context.client.guilds.cache.get(guildId)?.channels.cache.get(voiceChannelId);

  return channel?.isVoiceBased() === true && channel.members.some((member) => !member.user.bot);
};

/**
 * Keeps the music going after a track finished by queueing the best scoring tracks for the channel.
 * Does nothing unless autoplay is enabled for the guild and the queue has run dry.
 */
export const queueEncore = async (context: AppContext, player: Player<Requester>, ended: Track<Requester>) => {
  const { guildId, voiceChannelId } = player;

  if (!voiceChannelId || player.queue.next || player.playing) return;
  // Repeat modes own what plays next
  if (player.repeatMode !== RepeatMode.OFF) return;
  // Nobody is left to listen
  if (!hasListeners(context, guildId, voiceChannelId)) return;
  if (!(await isAutoplayEnabled(guildId))) return;

  const identifiers = await getContextualEncore(guildId, voiceChannelId);
  const candidates = identifiers.filter(
    (identifier) => identifier !== ended.info.identifier && !LISTEN_MOE_STREAMS.includes(identifier)
  );
  const tracks: Track<Requester>[] = [];

  for (const identifier of candidates) {
    try {
      const result = await context.link.availableNode.loadTrack(identifier);

      if (result.loadType !== LoadResultType.TRACK) continue;

      result.data.userData = {
        userId: context.applicationId,
        userName: 'Autoplay',
        textChannelId: ended.userData.textChannelId
      };
      tracks.push(result.data);
    } catch (error) {
      logger.warn('Unable to resolve encore track', { identifier, error });
    }
  }

  const [first, ...rest] = tracks;

  if (!first) return;

  // The player may have been used while we were resolving tracks
  if (player.playing || player.queue.next) return;

  logger.debug('Queueing encore', { guildId, count: tracks.length });

  player.queue.enqueue(...rest);
  await player.play(first);
};
