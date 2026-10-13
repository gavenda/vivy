import { redis } from 'bun';
import type { Player, Track } from './link';
import type { Requester } from './requester';

type TimeOfDay = 'late_night' | 'morning' | 'afternoon' | 'evening';

const COMPLETED_SCORE = 5;
const ABANDONED_SCORE = -3;

const channelKey = (guildId: string, channelId: string | null | undefined) => `diva:${guildId}:${channelId}`;
const timeKey = (guildId: string) => `diva:${guildId}:${getTimeOfDayBucket()}`;

/**
 * Called when a track ends to log the channel's musical context.
 * A track that played to the end is rewarded, one that was skipped or stopped is penalized.
 */
export const recordTrackMetrics = async (player: Player<Requester>, track: Track<Requester>, completed: boolean) => {
  const score = completed ? COMPLETED_SCORE : ABANDONED_SCORE;

  await redis.zincrby(channelKey(player.guildId, player.voiceChannelId), score, track.info.identifier);
  await redis.zincrby(timeKey(player.guildId), score, track.info.identifier);
};

/**
 * Fetches the best matching tracks to generate an organic encore queue.
 */
export const getContextualEncore = async (guildId: string, channelId: string, limit = 5): Promise<string[]> => {
  // Unique per call so concurrent encores for the same channel can't clobber each other.
  const tempKey = `diva:temp:${guildId}:${channelId}:${crypto.randomUUID()}`;

  try {
    // Weight the current channel preference over the time-of-day preference
    await redis.zunionstore(tempKey, 2, channelKey(guildId, channelId), timeKey(guildId), 'WEIGHTS', 2, 1);

    return await redis.zrevrange(tempKey, 0, limit - 1);
  } finally {
    await redis.del(tempKey);
  }
};

const getTimeOfDayBucket = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour < 6) return 'late_night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};
