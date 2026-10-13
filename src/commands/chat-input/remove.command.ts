import { MessageFlags, SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const remove: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('from')
        .setDescription('The first number of the music in the queue you want to remove.')
        .setRequired(true)
    )
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('to')
        .setDescription('The last number of the music in the queue you want to remove.')
    )
    .setName('remove')
    .setDescription('Remove a music in the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    const from = Math.max(0, interaction.options.getInteger('from', true) - 1);
    const to = interaction.options.getInteger('to');

    if (from >= player.queue.size) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.position_not_greater_than_queue_size', { lng: interaction.locale })
      });
      return;
    }

    if (to) {
      if (from >= to) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.position_not_greater_than_max', { lng: interaction.locale })
        });
        return;
      }

      player.queue.slice(from, to);

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.remove_track_range_from_queue', { lng: interaction.locale, from, to })
      });
    } else {
      const track = player.queue.peek(from);

      if (!track) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.invalid_range', { lng: interaction.locale })
        });
        return;
      }

      player.queue.slice(from + 1);

      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.remove_track_from_queue', { lng: interaction.locale, track: track.info.title })
      });
    }
  }
};
