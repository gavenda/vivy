import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppCommand } from './command';

export const resume: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused music.')
    .toJSON(),
  execute: async ({ link }, interaction) => {
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }

    const player = link.getPlayer(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    await player.resume();

    await interaction.reply({
      ephemeral: true,
      content: i18next.t('reply.music_resumed', { lng: interaction.locale })
    });
  }
};
