import { AppContext } from '@app/context';
import { LavalinkSource, Player } from '@app/link';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { handleTrack } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';
import { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyTrack = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
  queue: QueueType;
}) => {
  const { context, interaction, player, queue, spotifyUri } = options;
  const { spotify } = context;

  const spotifyTrack = await spotify.tracks.get(spotifyUri.id);
  const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
  const track = await lookupTrack({
    query: `${spotifyTrack.name} ${spotifyArtists}`,
    source: LavalinkSource.YOUTUBE_MUSIC,
    interaction,
    context
  });

  logger.debug(`Queuing spotify track`, { track: spotifyTrack.name });

  if (track) {
    await handleTrack({ interaction, track, player, queue });
  } else {
    await interaction.followUp({
      ephemeral: true,
      content: `There was an error looking up the music. Please try again.`
    });
  }
};
