import { RedisClient } from 'bun';
import { required } from './config';

/**
 * Shared redis client, fails fast on startup instead of silently falling back to localhost.
 */
export const redis = new RedisClient(required('REDIS_URL'));
