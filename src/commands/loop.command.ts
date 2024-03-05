import { hasVoiceState } from '@app/utils/has-voice-state';
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { AppCommand } from './command';

export const loop: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('track')
        .setDescription('Loop the current playing music.')
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('queue')
        .setDescription('Loop the entire music queue.')
    )
    .setName('loop')
    .setDescription('Loop the music queue.'),
  execute: async ({ link }, interaction) => {
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

    const player = link.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'track':
        player.setLoop(1);

        await interaction.reply({
          ephemeral: true,
          content: 'Now looping the current track.'
        });
        break;
      case 'queue':
        player.setLoop(2);

        await interaction.reply({
          ephemeral: true,
          content: 'Now looping the current queue.'
        });
        break;
    }
  }
};
