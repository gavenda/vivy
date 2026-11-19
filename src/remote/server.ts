import { getLogger } from '@logtape/logtape';
import { RedisClient } from 'bun';
import { required } from 'vivy/config';
import type { AppContext } from 'vivy/context';
import { redis } from 'vivy/redis';
import {
  REMOTE_MAX_MESSAGE_BYTES,
  REMOTE_OPS,
  REMOTE_PROTOCOL_VERSION,
  RemoteChannel,
  type RemoteOp,
  type RemoteRequest,
  type RemoteResponse
} from './contract';
import { RemoteFailure, toRemoteError } from './errors';
import { instanceId, publishEvent } from './events';
import { remoteHandlers } from './handlers';

const logger = getLogger(['vivy', 'remote']);

/** One stuck call (a Lavalink request that never answers) must not hold up the guild's later requests. */
const HANDLER_TIMEOUT_MS = 20_000;
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
/** Allowed difference between Plana's clock and this one. */
const CLOCK_SKEW_MS = 5000;

/**
 * Its own connection: one that has subscribed can't run other commands. It reconnects itself rather than through
 * Bun's auto reconnect, which isn't documented to subscribe again.
 */
let subscriber: RedisClient | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectDelay = RECONNECT_MIN_MS;
let stopped = false;

/** Requests run one after another per guild, so a play followed by a skip happen in that order. */
const guildQueues = new Map<string, Promise<unknown>>();

const serialize = <T>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = guildQueues.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  const settled = next.catch(() => undefined);

  guildQueues.set(key, settled);
  void settled.then(() => {
    if (guildQueues.get(key) === settled) guildQueues.delete(key);
  });

  return next;
};

const withTimeout = <T>(task: Promise<T>): Promise<T> =>
  Promise.race([
    task,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new RemoteFailure('INTERNAL', 'Timed out')), HANDLER_TIMEOUT_MS)
    )
  ]);

const respond = async (response: RemoteResponse) => {
  try {
    await redis.publish(RemoteChannel.response, JSON.stringify(response));
  } catch (error) {
    logger.error({ message: 'Unable to publish remote response', id: response.id, error });
  }
};

/** The request, or the id to answer with BAD_REQUEST, or nothing when there is no id to answer to. */
const parseRequest = (message: string): RemoteRequest | { id: string; error: string } | undefined => {
  let body: unknown;

  try {
    body = JSON.parse(message);
  } catch {
    return;
  }

  if (typeof body !== 'object' || body === null) return;

  const { v, id, op, sentAt, timeoutMs, params } = body as Record<string, unknown>;

  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return;
  if (v !== REMOTE_PROTOCOL_VERSION) return { id, error: `Unsupported protocol version ${String(v)}` };
  if (typeof op !== 'string' || !(REMOTE_OPS as readonly string[]).includes(op)) {
    return { id, error: `Unknown op ${String(op)}` };
  }
  if (typeof sentAt !== 'number' || typeof timeoutMs !== 'number')
    return { id, error: 'sentAt and timeoutMs are required' };
  if (typeof params !== 'object' || params === null) return { id, error: 'params is required' };

  return { v, id, op: op as RemoteOp, sentAt, timeoutMs, params } as RemoteRequest;
};

const handleMessage = async (context: AppContext, message: string) => {
  if (message.length > REMOTE_MAX_MESSAGE_BYTES) {
    logger.warn({ message: 'Dropping an oversized remote request', length: message.length });
    return;
  }

  const request = parseRequest(message);

  if (!request) {
    logger.debug({ message: 'Dropping a remote request without an id' });
    return;
  }

  const { id } = request;

  if ('error' in request) {
    await respond({
      v: REMOTE_PROTOCOL_VERSION,
      id,
      ok: false,
      error: { code: 'BAD_REQUEST', message: request.error }
    });
    return;
  }

  const { op, params, sentAt, timeoutMs } = request;
  const age = Date.now() - sentAt;

  // Plana has given up on it, carrying it out would surprise whoever retries
  if (age > timeoutMs || age < -CLOCK_SKEW_MS) {
    await respond({
      v: REMOTE_PROTOCOL_VERSION,
      id,
      ok: false,
      error: { code: 'EXPIRED', message: 'Request expired' }
    });
    return;
  }

  const guildId = 'guildId' in params && typeof params.guildId === 'string' ? params.guildId : 'search';
  const requesterId = 'requester' in params ? (params.requester as { id?: unknown } | undefined)?.id : undefined;

  logger.debug({ message: 'Received remote request', id, op, guildId, requesterId });

  try {
    const handler = remoteHandlers[op] as (context: AppContext, params: unknown) => Promise<unknown>;
    // Searches touch no player, they don't wait for a guild's other requests
    const run = () => {
      // It may have waited behind the guild's earlier requests until Plana gave up on it
      if (Date.now() - sentAt > timeoutMs) throw new RemoteFailure('EXPIRED', 'Request expired while waiting');

      return withTimeout(handler(context, params));
    };
    const result = op === 'search' ? await run() : await serialize(guildId, run);

    await respond({ v: REMOTE_PROTOCOL_VERSION, id, ok: true, result } as RemoteResponse);
  } catch (error) {
    const remoteError = toRemoteError(error);

    if (remoteError.code === 'INTERNAL') {
      logger.error({ message: 'Remote request failed', id, op, guildId, error });
    } else {
      logger.debug({ message: 'Remote request refused', id, op, guildId, code: remoteError.code });
    }

    await respond({ v: REMOTE_PROTOCOL_VERSION, id, ok: false, error: remoteError });
  }
};

const scheduleReconnect = (context: AppContext) => {
  if (stopped || reconnectTimer) return;

  logger.warn({ message: 'Remote control connection lost, reconnecting', delayMs: reconnectDelay });

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void connect(context);
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
};

const connect = async (context: AppContext) => {
  subscriber?.close();

  const client = new RedisClient(required('REDIS_URL'), { autoReconnect: false });

  subscriber = client;
  client.onclose = () => {
    if (subscriber === client) scheduleReconnect(context);
  };

  try {
    await client.subscribe(RemoteChannel.request, (message) => void handleMessage(context, message));
    reconnectDelay = RECONNECT_MIN_MS;
    logger.info({ message: 'Listening for remote control', channel: RemoteChannel.request });

    await publishEvent({ v: REMOTE_PROTOCOL_VERSION, type: 'ready', instanceId });
  } catch (error) {
    logger.error({ message: 'Unable to subscribe for remote control', error });
    // A failed connect may or may not have closed the client, make sure exactly one reconnect follows
    if (subscriber === client) {
      subscriber = undefined;
      client.close();
      scheduleReconnect(context);
    }
  }
};

/** Starts answering Plana's requests. */
export const startRemoteServer = async (context: AppContext) => {
  stopped = false;
  await connect(context);
};

export const stopRemoteServer = async () => {
  stopped = true;
  clearTimeout(reconnectTimer);
  reconnectTimer = undefined;

  const client = subscriber;

  subscriber = undefined;
  client?.close();

  await publishEvent({ v: REMOTE_PROTOCOL_VERSION, type: 'shutdown', instanceId });
};
