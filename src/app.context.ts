import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Client } from 'discord.js';
import { MoonlinkManager } from 'moonlink.js';
import { createClient } from 'redis';
import { Logger } from 'winston';

type RedisClient = ReturnType<typeof createClient>;

export interface AppContext {
  logger: Logger;
  client: Client;
  redis: RedisClient;
  moon: MoonlinkManager;
  spotify: SpotifyApi;
}
