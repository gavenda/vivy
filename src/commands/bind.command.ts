import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const bind: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('bind')
    .setDescription('Binds a sticky music queue in this channel.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
