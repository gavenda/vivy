import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const loop: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Loop the music queue.')
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('single')
        .setDescription('Loop the current playing music.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('all')
        .setDescription('Loop the entire music queue.'),
    ),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
