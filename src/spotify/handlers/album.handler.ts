import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { handleTracks } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';
import { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyAlbum = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: MoonlinkPlayer;
}) => {
  const { context, interaction, player, spotifyUri } = options;
  const { spotify } = context;

  const spotifyAlbum = await spotify.albums.get(spotifyUri.id);
  const tracks: MoonlinkTrack[] = [];

  logger.debug(`Queuing spotify album`, { album: spotifyAlbum.name });

  await interaction.followUp({
    ephemeral: true,
    content: i18next.t('reply.spotify_queued_album', { lng: interaction.locale, album: spotifyAlbum.name })
  });

  for (const spotifyTrack of spotifyAlbum.tracks.items) {
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

  await handleTracks({ tracks, name: spotifyAlbum.name, player, interaction });
};
