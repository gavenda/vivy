import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const skip: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing music.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
