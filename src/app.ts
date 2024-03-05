import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { createClient } from 'redis';
import { AppContext } from './app.context';
import { updatePlayer } from './app.player';
import { events } from './events';
import { logger } from './logger';
// @ts-expect-error no type definitions
import * as dotenv from '@dotenvx/dotenvx';
import {
  INode,
  IOptions,
  MoonlinkManager,
  MoonlinkNode,
  MoonlinkTrack,
  VoicePacket
} from 'moonlink.js';
import { Payload } from './payload';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

if (!process.env.TOKEN) {
  throw new Error('TOKEN is required.');
}
if (!process.env.CLIENT_ID) {
  throw new Error('CLIENT_ID is required.');
}
if (!process.env.GUILD_ID) {
  throw new Error('GUILD_ID is required.');
}
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is required.');
}
if (!process.env.SPOTIFY_CLIENT_ID) {
  throw new Error('SPOTIFY_CLIENT_ID is required.');
}
if (!process.env.SPOTIFY_CLIENT_SECRET) {
  throw new Error('SPOTIFY_CLIENT_SECRET is required.');
}
if (!process.env.LAVA_HOST) {
  throw new Error('LAVA_HOST is required.');
}
if (!process.env.LAVA_PASS) {
  throw new Error('LAVA_HOST is required.');
}
if (!process.env.LAVA_PORT) {
  throw new Error('LAVA_PORT is required.');
}

// Create redis client
const redis = createClient({
  url: process.env.REDIS_URL
});

// Create spotify client
const spotify = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET
);

// Create discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  presence: {
    status: 'online',
    activities: [{ name: `Flourite Eye's Song`, type: ActivityType.Listening }]
  }
});

const linkOptions: IOptions = {
  resume: true
};

const linkNodes: INode[] = [
  {
    host: process.env.LAVA_HOST,
    port: Number(process.env.LAVA_PORT),
    password: process.env.LAVA_PASS,
    secure: true,
    retryAmount: 100,
    retryDelay: 5000
  }
];

const sendVoiceUpdate = (guildId: string, payload: Payload) => {
  const guild = client.guilds.cache.get(guildId);

  if (guild) {
    guild.shard.send(payload);
  } else {
    logger.error('Unable to send payload to guild', { guildId });
  }
};

// Configure magmastream
const link = new MoonlinkManager(linkNodes, linkOptions, sendVoiceUpdate);

// Handle redis errors
redis.on('error', (error) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  logger.error('Redis error', { error });
});

// Handle raw packets
client.on(Events.Raw, (data: VoicePacket) => {
  link.packetUpdate(data);
});

// Handle application errors
client.on(Events.Error, (error) => {
  logger.error('Internal error', { error });
});

const context: AppContext = { client, redis, link, spotify };

// link events
link.on('nodeReady', (node: MoonlinkNode) => {
  const { host } = node;
  logger.info(`Connected to lavalink node`, { host });
});

link.on('nodeError', (node, error) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { host } = node;
  logger.info(`Error on lavalink node`, { host, error });
});
// eslint-disable-next-line @typescript-eslint/no-misused-promises
link.on('trackStart', async (player, track: MoonlinkTrack) => {
  logger.debug('Track start', { title: track.title });
  await updatePlayer(context, player.guildId);
});
// eslint-disable-next-line @typescript-eslint/no-misused-promises
link.on('trackEnd', async (player, track: MoonlinkTrack) => {
  logger.debug('Track end', { title: track.title });
  await updatePlayer(context, player.guildId);
});
// eslint-disable-next-line @typescript-eslint/no-misused-promises
link.on('queueEnd', async (player) => {
  logger.debug('Queue end');
  await updatePlayer(context, player.guildId);
});

link.on('trackError', (_player, track: MoonlinkTrack) => {
  logger.error('Track error', { title: track.title });
});

link.on('trackStuck', (_player, track: MoonlinkTrack) => {
  logger.error('Track stuck', { title: track.title });
});

// Register events
for (const { once, event, execute } of events) {
  logger.debug(`Registering event handler`, { event });

  if (once) {
    // @ts-expect-error too much OR typing here, compiler will get confused
    client.once(event, ($event) => execute(context, $event));
  } else {
    // @ts-expect-error too much OR typing here, compiler will get confused
    client.on(event, ($event) => execute(context, $event));
  }
}

// Graceful disconnect
// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, cleaning up');
  if (redis.isReady) {
    await redis.disconnect();
  }
  if (client.isReady()) {
    await client.destroy();
  }
});

try {
  // Connect to redis
  await redis.connect();
} catch (error) {
  logger.error('Unable to connect to redis', { error });
  process.exit(1);
}

try {
  // Now ready to login to gateway
  await client.login(process.env.TOKEN);
} catch (error) {
  logger.error('Unable to connect to discord gateway', { error });
  process.exit(1);
} finally {
  if (process.send) {
    process.send('ready');
  }
}
