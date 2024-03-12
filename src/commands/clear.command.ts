import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { AppCommand } from './command';
import i18next from 'i18next';

export const clear: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('effect')
        .setDescription('Clear the applied effects to the playing music.')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('queue').setDescription('Clear the music queue.'))
    .setName('clear')
    .setDescription('Clear an existing applied setting.'),
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

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'queue':
        player.queue.clear();
        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.cleared_queue', { lng: interaction.locale })
        });
        break;
      case 'effect':
        player.filters.resetFilters();
        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.cleared_effect', { lng: interaction.locale })
        });
        break;
    }
  }
};
