/**
 * Copies every key from one Redis to another, key by key, with its expiry. For moving Vivy's data
 * from its old container to the host's Valkey: a dump file can't always move, since each Redis and
 * Valkey version writes its own format and an older server refuses a newer file.
 *
 *   REDIS_URL=<from> bun redis-copy.ts export > vivy-redis.ndjson
 *   REDIS_URL=<to>   bun redis-copy.ts import < vivy-redis.ndjson
 *
 * One JSON line per key. Import replaces a key that already exists, so running it twice is safe.
 * Strings, hashes, sets, sorted sets and lists, which is all Vivy uses.
 */
import { RedisClient } from 'bun';

type Entry =
  | { key: string; ttl: number; type: 'string'; value: string }
  | { key: string; ttl: number; type: 'hash'; value: Record<string, string> }
  | { key: string; ttl: number; type: 'set' | 'list'; value: string[] }
  | { key: string; ttl: number; type: 'zset'; value: [string, number][] };

const url = process.env.REDIS_URL;
const mode = process.argv[2];

if (!url || (mode !== 'export' && mode !== 'import')) {
  console.error('Usage: REDIS_URL=<url> bun redis-copy.ts export|import');
  process.exit(1);
}

const redis = new RedisClient(url);
const send = (command: string, args: string[]) => redis.send(command, args) as Promise<unknown>;

const read = async (key: string): Promise<Entry | null> => {
  const [type, ttl] = (await Promise.all([send('TYPE', [key]), send('PTTL', [key])])) as [string, number];

  switch (type) {
    case 'string':
      return { key, ttl, type, value: String(await send('GET', [key])) };
    case 'hash':
      return { key, ttl, type, value: (await send('HGETALL', [key])) as Record<string, string> };
    case 'set':
      return { key, ttl, type, value: (await send('SMEMBERS', [key])) as string[] };
    case 'list':
      return { key, ttl, type, value: (await send('LRANGE', [key, '0', '-1'])) as string[] };
    case 'zset': {
      const pairs = (await send('ZRANGE', [key, '0', '-1', 'WITHSCORES'])) as [string, number][];
      return { key, ttl, type, value: pairs.map(([member, score]) => [member, Number(score)]) };
    }
    default:
      // Gone since the scan, or a type Vivy never writes
      if (type !== 'none') console.error(`skipped ${key}: ${type}`);
      return null;
  }
};

const write = async (entry: Entry) => {
  const { key, ttl } = entry;
  // An expired-in-between key (-2) is skipped, one without an expiry (-1) is kept forever
  if (ttl === -2) return;

  await send('DEL', [key]);

  switch (entry.type) {
    case 'string':
      await send('SET', [key, entry.value]);
      break;
    case 'hash':
      if (Object.keys(entry.value).length > 0) await send('HSET', [key, ...Object.entries(entry.value).flat()]);
      break;
    case 'set':
      if (entry.value.length > 0) await send('SADD', [key, ...entry.value]);
      break;
    case 'list':
      if (entry.value.length > 0) await send('RPUSH', [key, ...entry.value]);
      break;
    case 'zset':
      if (entry.value.length > 0) {
        await send('ZADD', [key, ...entry.value.flatMap(([member, score]) => [String(score), member])]);
      }
      break;
  }

  if (ttl > 0) await send('PEXPIRE', [key, String(ttl)]);
};

if (mode === 'export') {
  let cursor = '0';
  let count = 0;

  do {
    const [next, keys] = (await send('SCAN', [cursor, 'COUNT', '500'])) as [string, string[]];
    cursor = String(next);

    for (const key of keys) {
      const entry = await read(key);
      if (!entry) continue;
      process.stdout.write(JSON.stringify(entry) + '\n');
      count++;
    }
  } while (cursor !== '0');

  console.error(`exported ${count} keys`);
} else {
  let count = 0;

  for await (const line of console) {
    if (!line.trim()) continue;
    await write(JSON.parse(line) as Entry);
    count++;
  }

  console.error(`imported ${count} keys`);
}

redis.close();
