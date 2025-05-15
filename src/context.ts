import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Client } from 'discord.js';
import { createClient } from 'redis';
import { Lavalink } from './link';
import { ListenMoe } from './listen.moe';
import type { Requester } from './requester';

export interface AppContext {
  applicationId: string;
  client: Client;
  redis: ReturnType<typeof createClient>;
  link: Lavalink<Requester>;
  listenMoe: ListenMoe;
  spotify: SpotifyApi;
}
