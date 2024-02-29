import { SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import { AppCommand } from './command.js';

export const remove: AppCommand = {
  data: new SlashCommandBuilder()
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('from')
        .setDescription('The first number of the music in the queue you want to remove.')
        .setRequired(true),
    )
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('to')
        .setDescription('The last number of the music in the queue you want to remove.'),
    )
    .setName('remove')
    .setDescription('Remove a music in the music queue.'),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
