import { hasVoiceState } from '@app/utils/has-voice-state';
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import i18next from 'i18next';
import { AppCommand } from './command';

export const loop: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder().setName('track').setDescription('Loop the current playing music.')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('queue').setDescription('Loop the entire music queue.'))
    .setName('loop')
    .setDescription('Loop the music queue.'),
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
      case 'track':
        player.setLoop(1);

        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.loop_track', { lng: interaction.locale })
        });
        break;
      case 'queue':
        player.setLoop(2);

        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.loop_queue', { lng: interaction.locale })
        });
        break;
    }
  }
};
