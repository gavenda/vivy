import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { ActivityType, Client, Events, GatewayIntentBits, GatewaySendPayload } from 'discord.js';
import i18next from 'i18next';
import { createClient } from 'redis';
import { AppContext } from './context';
import { events } from './events';
import en from './locales/en.json';
import { logger } from './logger';
import { updatePlayer } from './player';
// @ts-expect-error no type definitions
import * as dotenv from '@dotenvx/dotenvx';
import { MoonlinkManager, MoonlinkPlayer, MoonlinkTrack, VoicePacket } from 'moonlink.js';
import { LISTEN_MOE_JPOP_STREAM, LISTEN_MOE_KPOP_STREAM, LISTEN_MOE_STREAMS, ListenMoe, RadioType } from './listen.moe';

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
const spotify = SpotifyApi.withClientCredentials(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET);

// Create listen moe radio
const listenMoe = new ListenMoe();

// Create discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  presence: {
    status: 'online',
    activities: [{ name: `Flourite Eye's Song`, type: ActivityType.Listening }]
  }
});

// Configure lava link
const link = new MoonlinkManager(
  [
    {
      host: process.env.LAVA_HOST,
      port: Number(process.env.LAVA_PORT),
      secure: true,
      password: process.env.LAVA_PASS
    }
  ],
  {
    autoResume: true,
    resume: true
  },
  (guildId: string, data: GatewaySendPayload) => {
    const guild = client.guilds.cache.get(guildId);

    if (guild) {
      guild.shard.send(data);
    }
  }
);

// Handle redis errors
redis.on('error', (error) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  logger.error('Redis error', { error });
});

// Handle raw packets
client.on('raw', (data: VoicePacket) => {
  link.packetUpdate(data);
});

// Handle application errors
client.on(Events.Error, (error) => {
  logger.error('Internal error', { error });
});

const context: AppContext = {
  applicationId: process.env.CLIENT_ID,
  listenMoe,
  client,
  redis,
  link,
  spotify
};

// listen moe events
listenMoe.on('trackUpdate', async () => {
  if (!link.players.all) return;

  const players = link.players.all as MoonlinkPlayer[];

  for (const player of players) {
    const track = player.current as MoonlinkTrack;
    if (track && LISTEN_MOE_STREAMS.includes(track.identifier)) {
      await updatePlayer(context, player.guildId);
    }
  }
});

// link events
link.on('nodeReady', (node) => {
  const { host } = node;
  logger.info(`Connected to node`, { host });
});

link.on('nodeError', (node, error) => {
  const { host } = node;
  logger.info(`Error on node`, { host, error });
});

link.on('nodeResumed', (node) => {
  const { host } = node;
  logger.info(`Session resumed`, { host });
});

link.on('nodeDestroy', (node) => {
  const { host } = node;
  logger.info(`Destroy node`, { host });
});

link.on('playerMove', (player, oldVoiceChannelId, newVoiceChannelId) => {
  const { guildId } = player;
  logger.info('Player moved', { guildId, oldVoiceChannelId, newVoiceChannelId });
});

link.on('nodeClose', (node, code, reason) => {
  const { host } = node;
  logger.info('Player socket closed', { host, code, reason });
});

link.on('trackStart', async (player, track: MoonlinkTrack) => {
  logger.info('Track start', { title: track.title, guild: player.guildId });

  if (track.identifier === LISTEN_MOE_JPOP_STREAM) {
    listenMoe.connect(RadioType.JPOP);
  }
  if (track.identifier === LISTEN_MOE_KPOP_STREAM) {
    listenMoe.connect(RadioType.KPOP);
  }

  await updatePlayer(context, player.guildId);
});

link.on('trackEnd', async (player, track: MoonlinkTrack, reason) => {
  logger.info('Track end', { title: track.title, guild: player.guildId, reason });

  if (LISTEN_MOE_STREAMS.includes(track.identifier)) {
    listenMoe.disconnect();
  }

  await updatePlayer(context, player.guildId);
});

link.on('queueEnd', () => {
  logger.debug('Queue end');
});

link.on('trackError', async (player, track: MoonlinkTrack) => {
  logger.info('Track error', { title: track.title, guild: player.guildId });
  await player.skip();
});

link.on('trackStuck', async (player, track: MoonlinkTrack) => {
  logger.info('Track stuck', { title: track.title, guild: player.guildId });
  await player.skip();
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
  // Initialize i18next
  await i18next.init({
    lng: 'en-US',
    resources: {
      en
    }
  });

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
