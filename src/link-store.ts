import type { LavalinkStateStore } from './link';
import { redis } from './redis';

/**
 * Keeps the lavalink client state in redis.
 */
export const redisLavalinkStateStore: LavalinkStateStore = {
  get: (key) => redis.get(key),
  set: async (key, value) => {
    await redis.set(key, value);
  },
  del: async (key) => {
    await redis.del(key);
  },
  keys: (pattern) => redis.keys(pattern)
};
