import { redis } from 'vivy/redis';
import { timeZone } from 'vivy/config';
import type { Track } from 'vivy/link/payload/track';
import type { Requester } from 'vivy/requester';
import type { Player } from 'vivy/link/player';

/** Daily counts are kept a little over a year, long enough for any period a dashboard asks for. */
const DAY_KEY_TTL_SECONDS = 400 * 86_400;

let dayFormat: Intl.DateTimeFormat | undefined;

/** Today's date as YYYY-MM-DD in TIMEZONE, so a reader such as Plana can work out the same keys. */
const today = () => {
  dayFormat ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return dayFormat.format(new Date());
};

export const recordTrackStatistics = async (player: Player<Requester>, track: Track<Requester>) => {
  const guildId = player.guildId;
  const trackId = track.info.identifier || track.info.uri || track.info.title;

  if (!trackId) return;

  const trackMetaKey = `stats:track:meta:${encodeURIComponent(trackId)}`;
  const userId = track.userData.userId;
  const userMetaKey = `stats:user:meta:${userId}`;

  const date = today();
  const dayTracksKey = `stats:guild:${guildId}:day:${date}:tracks:plays`;
  const dayUsersKey = `stats:guild:${guildId}:day:${date}:users:requests`;

  // None of the writes depend on each other, sending them together lets the client pipeline them
  await Promise.all([
    redis.zincrby('stats:tracks:plays', 1, trackId),
    redis.zincrby(`stats:guild:${guildId}:tracks:plays`, 1, trackId),
    redis.zincrby('stats:tracks:duration', track.info.length ?? 0, trackId),
    redis.hset(trackMetaKey, {
      title: track.info.title,
      author: track.info.author,
      uri: track.info.uri ?? '',
      length: String(track.info.length ?? 0),
      artworkUrl: track.info.artworkUrl ?? ''
    }),
    redis.zincrby('stats:users:requests', 1, userId),
    redis.zincrby(`stats:guild:${guildId}:users:requests`, 1, userId),
    redis.zincrby('stats:users:duration', track.info.length ?? 0, userId),
    redis.sadd('stats:users:seen', userId),
    redis.sadd(`stats:guild:${guildId}:users:seen`, userId),
    redis.hset(userMetaKey, {
      username: track.userData.userName ?? userId
    }),
    // Counted per day too, so a dashboard can show any period rather than only all time
    redis.zincrby(dayTracksKey, 1, trackId),
    redis.zincrby(dayUsersKey, 1, userId),
    redis.expire(dayTracksKey, DAY_KEY_TTL_SECONDS),
    redis.expire(dayUsersKey, DAY_KEY_TTL_SECONDS),
    // The first day with daily counts, so a reader knows how far back they go
    redis.send('SET', [`stats:guild:${guildId}:day:first`, date, 'NX'])
  ]);
};
