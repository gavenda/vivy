import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const unbind: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('unbind')
    .setDescription('Unbinds the sticky music queue from this channel.'),
  execute: async (context, interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.'
    });
  }
};
