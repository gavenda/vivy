import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder, SlashCommandNumberOption } from 'discord.js';
import i18next from 'i18next';
import type { AppCommand } from './command';

export const volume: AppCommand = {
  data: new SlashCommandBuilder()
    .addNumberOption(
      new SlashCommandNumberOption()
        .setName('volume')
        .setRequired(true)
        .setDescription('The volume amount (maximum of 100, minimum of 0).')
    )
    .setName('volume')
    .setDescription('The volume level you want to set (maximum of 100, minimum of 0).')
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

    const volume = interaction.options.getNumber('volume', true);

    if (volume > 100) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.volume_not_greater_than_max', { lng: interaction.locale, max: 100 })
      });
      return;
    }

    if (volume < 0) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.volume_not_less_than_zero', { lng: interaction.locale })
      });
      return;
    }

    await player.applyVolume(volume / 100);

    await interaction.reply({
      ephemeral: true,
      content: i18next.t('reply.volume_applied', { lng: interaction.locale, volume })
    });
  }
};
