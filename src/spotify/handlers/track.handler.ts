import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { handleQueueSelection, handleTrack } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer } from 'moonlink.js';
import { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyTrack = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: MoonlinkPlayer;
}) => {
  const { context, interaction, player, spotifyUri } = options;
  const { spotify } = context;

  const spotifyTrack = await spotify.tracks.get(spotifyUri.id);
  const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
  const track = await lookupTrack({
    query: `${spotifyTrack.name} ${spotifyArtists}`,
    source: 'youtubemusic',
    interaction,
    context
  });

  logger.debug(`Queuing spotify track`, { track: spotifyTrack.name });

  if (track) {
    if (player.current) {
      await handleQueueSelection({ interaction, track, player });
    } else {
      await handleTrack({ interaction, track, player, queue: 'later' });
    }
  } else {
    await interaction.followUp({
      ephemeral: true,
      content: i18next.t('reply.error_lookup', { lng: interaction.locale })
    });
  }
};
