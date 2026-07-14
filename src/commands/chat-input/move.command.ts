import { hasVoiceState } from 'vivy/utils';
import { MessageFlags, SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

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
  execute: async ({ link }, interaction) => {
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const player = link.findPlayerByGuildId(interaction.guildId);

    if (!player) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

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
