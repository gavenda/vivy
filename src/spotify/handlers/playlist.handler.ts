import { AppContext } from '@app/context';
import { LavalinkSource, Player, Track } from '@app/link';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { handleTracks } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';
import { ParsedSpotifyUri } from 'spotify-uri';
import { Worker } from 'worker_threads';

export const handleSpotifyPlaylist = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
  queue: QueueType;
}) => {
  const { context, interaction, player, queue, spotifyUri } = options;
  const { spotify } = context;

  if (queue !== 'later') {
    await interaction.followUp({
      ephemeral: true,
      content: `Trying to load an entire playlist on priority is cheating.`
    });
    return;
  }

  const spotifyPlaylist = await spotify.playlists.getPlaylist(spotifyUri.id);
  const tracks: Track<Requester>[] = [];

  logger.debug(`Queuing spotify playlist`, { album: spotifyPlaylist.name });

  await interaction.followUp({
    ephemeral: true,
    content: `Queuing spotify playlist \`${spotifyPlaylist.name}\`.`
  });

  for (const { track: spotifyTrack } of spotifyPlaylist.tracks.items) {
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

  await handleTracks({ tracks, name: spotifyPlaylist.name, queue, player, interaction });
};
