import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { getLogger } from '@logtape/logtape';
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';
import i18next from 'i18next';
import { loadConfig, type Config } from './config';
import type { AppContext } from './context';
import { registerDiscordEvents } from './discord-events';
import { Lavalink } from './link';
import { registerLinkEvents } from './link-events';
import { ListenMoe } from './listen.moe';
import { registerListenMoeEvents } from './listen-moe-events';
import en from './locales/en.json';
import { configureLogging } from './logging';
import type { Requester } from './requester';

const createContext = (config: Config): AppContext => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ],
    presence: {
      status: 'online',
      activities: [{ name: `Flourite Eye's Song 🎶`, type: ActivityType.Custom }]
    }
  });

  const link = new Lavalink<Requester>({
    nodes: [
      {
        host: config.lavalink.host,
        port: config.lavalink.port,
        secure: config.lavalink.secure,
        authorization: config.lavalink.password
      }
    ],
    sendVoiceUpdate: (guildId, data) => {
      client.guilds.cache.get(guildId)?.shard.send(data);
    }
  });

  return {
    applicationId: config.clientId,
    client,
    link,
    listenMoe: new ListenMoe(),
    spotify: SpotifyApi.withClientCredentials(config.spotify.clientId, config.spotify.clientSecret)
  };
};

export const main = async () => {
  const config = loadConfig();

  await configureLogging();

  const logger = getLogger(['vivy', 'main']);
  const context = createContext(config);

  registerDiscordEvents(context);
  registerLinkEvents(context);
  registerListenMoeEvents(context);

  const cleanup = async () => {
    logger.info('Received SIGINT/SIGTERM, cleaning up');
    if (context.client.isReady()) {
      await context.client.destroy();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    await i18next.init({
      lng: 'en-US',
      resources: { en }
    });

    await context.client.login(config.token);

    process.send?.('ready');
  } catch (error) {
    logger.error('Unable to connect to discord gateway', { error });
    process.exit(1);
  }
};
