import { hasVoiceState } from 'vivy/utils';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

export const shuffle: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the music queue.')
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

    player.queue.shuffle();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.queue_shuffled', { lng: interaction.locale })
    });
  }
};
