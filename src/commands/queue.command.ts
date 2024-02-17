import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const queue: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
