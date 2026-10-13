import type { AppContext } from 'vivy/context';
import type { Player } from 'vivy/link';

import type { Requester } from 'vivy/requester';
import type { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import type { ParsedSpotifyUri } from 'spotify-uri';
import { getLogger } from '@logtape/logtape';
import { handleSpotifyCollection } from './collection.handler';

const logger = getLogger(['vivy', 'handler:playlist']);

export const handleSpotifyPlaylist = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
}) => {
  const { context, interaction, player, spotifyUri } = options;
  const { spotify } = context;

  const spotifyPlaylist = await spotify.playlists.getPlaylist(spotifyUri.id);

  logger.debug({ message: `Queuing spotify playlist`, playlist: spotifyPlaylist.name });

  await handleSpotifyCollection({
    context,
    interaction,
    player,
    name: spotifyPlaylist.name,
    queuedMessage: i18next.t('reply.spotify_queued_playlist', {
      lng: interaction.locale,
      playlist: spotifyPlaylist.name
    }),
    items: spotifyPlaylist.tracks.items.map(({ track }) => track)
  });
};
