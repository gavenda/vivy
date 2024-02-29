import { SlashCommandBuilder, SlashCommandNumberOption } from 'discord.js';
import { AppCommand } from './command.js';

export const volume: AppCommand = {
  data: new SlashCommandBuilder()
    .addNumberOption(
      new SlashCommandNumberOption()
        .setName('volume')
        .setDescription('The volume amount (maximum of 100, minimum of 0).'),
    )
    .setName('volume')
    .setDescription('The volume level you want to set (maximum of 100, minimum of 0).'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
