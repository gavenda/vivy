import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { Client } from 'discord.js';
import { createClient } from 'redis';
import { ListenMoe } from './listen.moe';
import { MoonlinkManager } from 'moonlink.js';

export interface AppContext {
  applicationId: string;
  client: Client;
  redis: ReturnType<typeof createClient>;
  link: MoonlinkManager;
  listenMoe: ListenMoe;
  spotify: SpotifyApi;
}
