import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const disconnect: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the player from the voice channel.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
