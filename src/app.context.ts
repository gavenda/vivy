import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Client } from 'discord.js';
import { Manager } from 'magmastream';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

export interface AppContext {
  client: Client;
  redis: RedisClient;
  magma: Manager;
  spotify: SpotifyApi;
}
