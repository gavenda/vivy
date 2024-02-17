import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { AppCommand } from './command.js';

export const playlist: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Manage your playlist.')
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('list')
        .setDescription('List all your created playlist.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('show')
        .setDescription('Show your playlist music.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('create')
        .setDescription('Create your own playlist.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('delete')
        .setDescription('Delete your own playlist.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('add')
        .setDescription('Add a music to your playlist.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('remove')
        .setDescription('Remove a music from your playlist.'),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('queue')
        .setDescription('Queue the music in your playlist.'),
    ),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
