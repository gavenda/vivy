import { Guild, GuildMember } from 'discord.js';
import { MoonlinkManager } from 'moonlink.js';
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

interface Jukebox {
  moon?: MoonlinkManager;
}

export interface PlayRequest {
  member: GuildMember;
  guild: Guild;
}

export const jukebox: Jukebox = {};
export const spotify = SpotifyApi.withClientCredentials(
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET,
);

export const playNow = (request: PlayRequest) => {};
