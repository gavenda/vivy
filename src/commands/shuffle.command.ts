import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const shuffle: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the music queue.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
