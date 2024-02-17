import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const resume: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused music.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
