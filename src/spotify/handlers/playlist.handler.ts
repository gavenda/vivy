import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { handleTracks } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';
import { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyPlaylist = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: MoonlinkPlayer;
}) => {
  const { context, interaction, player, spotifyUri } = options;
  const { spotify } = context;

  const spotifyPlaylist = await spotify.playlists.getPlaylist(spotifyUri.id);
  const tracks: MoonlinkTrack[] = [];

  logger.debug(`Queuing spotify playlist`, { album: spotifyPlaylist.name });

  await interaction.followUp({
    ephemeral: true,
    content: i18next.t('reply.spotify_queued_playlist', { lng: interaction.locale, playlist: spotifyPlaylist.name })
  });

  for (const { track: spotifyTrack } of spotifyPlaylist.tracks.items) {
    const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
    const track = await lookupTrack({
      query: `${spotifyTrack.name} ${spotifyArtists}`,
      source: 'youtubemusic',
      interaction,
      context
    });

    if (track) {
      tracks.push(track);
    }
  }

  await handleTracks({ tracks, name: spotifyPlaylist.name, player, interaction });
};
