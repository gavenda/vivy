import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const stop: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the currently playing music.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
