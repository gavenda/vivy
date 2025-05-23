import { Player, type Track } from '@app/link';
import type { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';

export const handleTracks = async (options: {
  tracks: Track<Requester>[];
  name: string;
  player: Player<Requester>;
  interaction: ChatInputCommandInteraction;
}) => {
  const { tracks, interaction, player, name } = options;

  player.queue.enqueue(...tracks);

  if (!interaction.replied) {
    await interaction.followUp({
      ephemeral: true,
      content: i18next.t('reply.music_queued', { lng: interaction.locale, track: name })
    });
  }

  if (!player.queue.current) {
    await player.play();
  }
};
