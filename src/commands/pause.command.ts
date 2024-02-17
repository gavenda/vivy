import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const pause: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the playing music.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
