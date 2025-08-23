import type { AppContext } from '@app/context';
import { LavalinkSource, Player } from '@app/link';
import { logger } from '@app/logger';
import { handleQueueSelection, handleTrack } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import type { Requester } from '@app/requester';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import i18next from 'i18next';
import type { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyTrack = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
}) => {
  const { context, interaction, player, spotifyUri } = options;
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
    if (player.queue.current) {
      await handleQueueSelection({ interaction, track, player });
    } else {
      await handleTrack({ interaction, track, player, queue: 'later' });
    }
  } else {
    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.error_lookup', { lng: interaction.locale })
    });
  }
};
