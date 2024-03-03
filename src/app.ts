import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { MoonlinkManager, MoonlinkTrack, VoicePacket } from 'moonlink.js';
import { createClient } from 'redis';
import { AppContext } from './app.context';
import { events } from './events';

import dotenv from 'dotenv';
import { updatePlayer } from './app.player';
import { logger } from './logger';

// Load environment variables
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

// Configure moonlink
const moon = new MoonlinkManager(
  [
    {
      host: 'localhost',
      port: 2333,
      password: 'flourite',
      secure: false,
      regions: ['ph'],
      retryAmount: 10,
      retryDelay: 10000
    }
  ],
  {
    balancingPlayersByRegion: true,
    destroyPlayersStopped: true,
    autoResume: true,
    previousTracksInArray: false
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (guildId: string, payload: any) => {
    const guild = client.guilds.cache.get(guildId);

    if (guild) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      guild.shard.send(JSON.parse(payload));
    } else {
      logger.error('Unable to send payload to guild', { guildId });
    }
  }
);

// Handle raw packets
client.on(Events.Raw, (data: VoicePacket) => {
  moon.packetUpdate(data);
});

// Handle application errors
client.on(Events.Error, (error) => {
  logger.error('Internal error', { error });
});

const context: AppContext = { client, redis, moon, spotify };

// Moon events
moon.on('nodeCreate', (node) => {
  logger.info(`Connected to lavalink node`, { host: node.host });
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
moon.on('trackStart', async (player, track: MoonlinkTrack) => {
  logger.debug('Track start', { title: track.title });
  await updatePlayer(context, player.guildId);
});
// eslint-disable-next-line @typescript-eslint/no-misused-promises
moon.on('trackEnd', async (player, track: MoonlinkTrack) => {
  logger.debug('Track end', { title: track.title });
  await updatePlayer(context, player.guildId);
});
// eslint-disable-next-line @typescript-eslint/no-misused-promises
moon.on('queueEnd', async (player) => {
  logger.debug('Queue end');
  await updatePlayer(context, player.guildId);
});

moon.on('trackError', (_player, track: MoonlinkTrack) => {
  logger.error('Track error', { title: track.title });
});

moon.on('trackStuck', (_player, track: MoonlinkTrack) => {
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
}
