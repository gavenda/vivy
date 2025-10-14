import { RepeatMode } from 'vivy/link';
import { hasVoiceState } from 'vivy/utils/has-voice-state';
import { MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

export const loop: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder().setName('track').setDescription('Loop the current playing music.')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('queue').setDescription('Loop the entire music queue.'))
    .setName('loop')
    .setDescription('Loop the music queue.')
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

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'track':
        player.repeatMode = RepeatMode.TRACK;

        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.loop_track', { lng: interaction.locale })
        });
        break;
      case 'queue':
        player.repeatMode = RepeatMode.QUEUE;

        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.loop_queue', { lng: interaction.locale })
        });
        break;
    }
  }
};
