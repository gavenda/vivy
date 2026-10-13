import { MessageFlags, SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const move: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('queue-number')
        .setDescription('The number of the music in the queue you want to move.')
        .setRequired(true)
    )
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('to')
        .setDescription('The number in the queue you want to move into.')
        .setRequired(true)
    )
    .setName('move')
    .setDescription('Move music in the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    const queueNum = Math.max(0, interaction.options.getInteger('queue-number', true) - 1);
    const toQueueNum = interaction.options.getInteger('to', true) - 1;

    if (queueNum < 0 || queueNum >= player.queue.size) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.queue_number_out_of_range', { lng: interaction.locale })
      });
      return;
    }

    if (toQueueNum < 0 || toQueueNum >= player.queue.size) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.queue_number_out_of_range', { lng: interaction.locale })
      });
      return;
    }

    const track = player.queue.peek(queueNum);

    if (!track) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.invalid_queue_number', { lng: interaction.locale })
      });
      return;
    }

    player.queue.swap(queueNum, toQueueNum);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.move_track_in_queue', {
        lng: interaction.locale,
        track: track.info.title,
        position: toQueueNum + 1
      })
    });
  }
};
