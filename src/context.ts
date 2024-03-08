import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Client } from 'discord.js';
import { createClient } from 'redis';
import { Lavalink } from './link';
import { Requester } from './requester';

export interface AppContext {
  client: Client;
  redis: ReturnType<typeof createClient>;
  link: Lavalink<Requester>;
  spotify: SpotifyApi;
}
