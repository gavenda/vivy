import { redis } from 'bun';
import type { Track } from 'vivy/link/payload/track';
import type { Requester } from 'vivy/requester';
import type { Player } from 'vivy/link/player';

export const recordTrackStatistics = async (player: Player<Requester>, track: Track<Requester>) => {
  const guildId = player.guildId;
  const trackId = track.info.identifier || track.info.uri || track.info.title;

  if (!trackId) return;

  const trackMetaKey = `stats:track:meta:${encodeURIComponent(trackId)}`;
  const userId = track.userData.userId;
  const userMetaKey = `stats:user:meta:${userId}`;

  await redis.zincrby('stats:tracks:plays', 1, trackId);
  await redis.zincrby(`stats:guild:${guildId}:tracks:plays`, 1, trackId);
  await redis.zincrby('stats:tracks:duration', track.info.length ?? 0, trackId);

  await redis.hset(trackMetaKey, {
    title: track.info.title,
    author: track.info.author,
    uri: track.info.uri ?? ''
  });

  await redis.zincrby('stats:users:requests', 1, userId);
  await redis.zincrby(`stats:guild:${guildId}:users:requests`, 1, userId);
  await redis.zincrby('stats:users:duration', track.info.length ?? 0, userId);
  await redis.sadd('stats:users:seen', userId);
  await redis.sadd(`stats:guild:${guildId}:users:seen`, userId);
  await redis.hset(userMetaKey, {
    username: track.userData.userName ?? userId
  });
};
