import { AppContext } from '@app/context';
import { LavalinkSource, Player, Track } from '@app/link';
import { logger } from '@app/logger';
import { handleTracks } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';
import { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyAlbum = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
}) => {
  const { context, interaction, player, spotifyUri } = options;
  const { spotify } = context;

  const spotifyAlbum = await spotify.albums.get(spotifyUri.id);
  const tracks: Track<Requester>[] = [];

  logger.debug(`Queuing spotify album`, { album: spotifyAlbum.name });

  await interaction.followUp({
    ephemeral: true,
    content: `Queuing spotify album \`${spotifyAlbum.name}\`.`
  });

  for (const spotifyTrack of spotifyAlbum.tracks.items) {
    const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
    const track = await lookupTrack({
      query: `${spotifyTrack.name} ${spotifyArtists}`,
      source: LavalinkSource.YOUTUBE_MUSIC,
      interaction,
      context
    });

    if (track) {
      tracks.push(track);
    }
  }

  await handleTracks({ tracks, name: spotifyAlbum.name, player, interaction });
};
