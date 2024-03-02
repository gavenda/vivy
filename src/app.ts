import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';
import { MoonlinkManager } from 'moonlink.js';
import { createClient } from 'redis';
import { events } from './events.js';
import { createLogger, format, transports } from 'winston';
import { AppContext } from './app.context.js';

import dotenv from 'dotenv';

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

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'lumi' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error', dirname: 'logs' }),
    new transports.File({ filename: 'lumi.log', dirname: 'logs' }),
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    })
  ]
});

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
      secure: false
    }
  ],
  {
    balancingPlayersByRegion: true,
    destroyPlayersStopped: false,
    autoResume: true,
    previousTracksInArray: false
  },
  (guildId: string, payload: any) => {
    const guild = client.guilds.cache.get(guildId);

    if (guild) {
      guild.shard.send(JSON.parse(payload));
    } else {
      logger.error('Unable to send payload to guild', { guildId });
    }
  }
);

// Moon events
moon.on('nodeCreate', (node) => {
  logger.info(`Connected to lavalink node`, { host: node.host });
});

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in`, { user: readyClient.user.tag });

  // Init moon
  moon.init(readyClient.user.id);
});

client.on(Events.Raw, (data) => {
  moon.packetUpdate(data);
});

const appContext: AppContext = { logger, client, redis, moon, spotify };

// Register events
for (const { event, execute } of events) {
  client.on(event, (interaction) => execute(appContext, interaction));
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
