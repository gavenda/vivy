import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';
import { hasVoiceState } from '@/utils/has-voice-state.js';

export const loop: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('single')
        .setDescription('Loop the current playing music.')
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('all')
        .setDescription('Loop the entire music queue.')
    )
    .setName('loop')
    .setDescription('Loop the music queue.'),
  execute: async ({ moon }, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: `You are not in a guild.`,
        ephemeral: true
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: `Illegal attempt for a non gateway interaction request.`,
        ephemeral: true
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: `You are not in a voice channel.`,
        ephemeral: true
      });
      return;
    }

    const player = moon.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'single':
        player.setLoop('track');

        await interaction.reply({
          ephemeral: true,
          content: 'Now looping the current track.'
        });
        break;
      case 'all':
        player.setLoop('queue');

        await interaction.reply({
          ephemeral: true,
          content: 'Now looping the current queue.'
        });
        break;
    }
  }
};
