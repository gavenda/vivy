import { RedisClient } from 'bun';
import { required } from './config';

let client: RedisClient | undefined;

const getClient = () => (client ??= new RedisClient(required('REDIS_URL')));

/**
 * Shared redis client, never falling back to localhost silently.
 *
 * It is created on first use rather than on import, so entry points that only load the app's modules
 * without talking to redis, such as registering commands, don't need REDIS_URL. The app itself still
 * fails fast, loadConfig requires the url on startup.
 */
export const redis: RedisClient = new Proxy({} as RedisClient, {
  get: (_target, property) => {
    const instance = getClient();
    const value: unknown = Reflect.get(instance, property, instance);

    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  }
});
