import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command';
import i18next from 'i18next';

export const disconnect: AppCommand = {
  data: new SlashCommandBuilder().setName('disconnect').setDescription('Disconnect the player from the voice channel.'),
  execute: async ({ link }, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
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

    const player = link.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    player.disconnect();

    await interaction.reply({
      ephemeral: true,
      content: i18next.t('reply.disconnected_from_channel', { lng: interaction.locale })
    });
  }
};
