import { hasVoiceState } from '@app/utils';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppCommand } from './command';

export const stop: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the currently playing music.')
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

    await player.queue.clear();
    await player.stop();
    await player.destroy();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.music_stopped', { lng: interaction.locale })
    });
  }
};
