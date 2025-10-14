import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Client } from 'discord.js';
import { Lavalink } from './link';
import { ListenMoe } from './listen.moe';
import type { Requester } from './requester';

export interface AppContext {
  applicationId: string;
  client: Client;
  link: Lavalink<Requester>;
  listenMoe: ListenMoe;
  spotify: SpotifyApi;
}
