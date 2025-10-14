import type { AppContext } from 'vivy/context';
import { LavalinkSource, Player } from 'vivy/link';
import { logger } from 'vivy/logger';
import { QueueType } from 'vivy/player';
import { handleQueueSelection, handleTrack } from 'vivy/player/handlers';
import { lookupTrack } from 'vivy/player/lookup';
import type { Requester } from 'vivy/requester';
import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import i18next from 'i18next';
import type { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyTrack = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { context, interaction, player, spotifyUri, queueType } = options;
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
      await handleQueueSelection({ interaction, track, player, queueType });
    } else {
      await handleTrack({ interaction, track, player, queueType: QueueType.LATER });
    }
  } else {
    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.error_lookup', { lng: interaction.locale })
    });
  }
};
