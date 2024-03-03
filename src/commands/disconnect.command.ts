import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command';
import { hasVoiceState } from '@/utils/has-voice-state';

export const disconnect: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the player from the voice channel.'),
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

    player.disconnect();

    await interaction.reply({
      ephemeral: true,
      content: 'Disconnected from voice channel.'
    });
  }
};
