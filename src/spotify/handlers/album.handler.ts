import type { AppContext } from 'vivy/context';
import type { Player } from 'vivy/link';

import type { Requester } from 'vivy/requester';
import type { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import type { ParsedSpotifyUri } from 'spotify-uri';
import { getLogger } from '@logtape/logtape';
import { handleSpotifyCollection } from './collection.handler';

const logger = getLogger(['vivy', 'handler:album']);

export const handleSpotifyAlbum = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
}) => {
  const { context, interaction, player, spotifyUri } = options;
  const { spotify } = context;

  const spotifyAlbum = await spotify.albums.get(spotifyUri.id);

  logger.debug({ message: `Queuing spotify album`, album: spotifyAlbum.name });

  await handleSpotifyCollection({
    context,
    interaction,
    player,
    name: spotifyAlbum.name,
    queuedMessage: i18next.t('reply.spotify_queued_album', { lng: interaction.locale, album: spotifyAlbum.name }),
    items: spotifyAlbum.tracks.items
  });
};
