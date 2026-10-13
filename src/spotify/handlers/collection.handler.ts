import type { AppContext } from 'vivy/context';
import { LavalinkSource, type Player, type Track } from 'vivy/link';

import { handleTracks } from 'vivy/player/handlers';
import { lookupTrack } from 'vivy/player/lookup';
import type { Requester } from 'vivy/requester';
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';

/**
 * The part of a spotify track that is needed to find it on lavalink.
 */
export interface SpotifyTrackItem {
  name: string;
  artists: { name: string }[];
}

/**
 * Looks every track of a spotify album or playlist up and queues what was found.
 */
export const handleSpotifyCollection = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  player: Player<Requester>;
  /**
   * Name of the album or playlist.
   */
  name: string;
  /**
   * Reply sent right away, looking every track up takes a while.
   */
  queuedMessage: string;
  items: SpotifyTrackItem[];
}) => {
  const { context, interaction, player, name, queuedMessage, items } = options;
  const tracks: Track<Requester>[] = [];

  await interaction.followUp({
    flags: MessageFlags.Ephemeral,
    content: queuedMessage
  });

  for (const spotifyTrack of items) {
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

  await handleTracks({ tracks, name, player, interaction });
};
