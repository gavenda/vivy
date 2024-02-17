import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from 'discord.js';
import { AppCommand } from './command.js';

export const clear: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear an existing applied setting.')
    .addSubcommandGroup(
      new SlashCommandSubcommandGroupBuilder()
        .setName('effect')
        .setDescription('Clear an applied effect to the playing music.')
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('effect')
            .setDescription('Clear an applied effect to the playing music.'),
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('filter')
            .setDescription('Clear the applied filter(s) to the playing music.'),
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('equalizer')
            .setDescription('Clear the applied equalizer(s) to the playing music.'),
        ),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder().setName('queue').setDescription('Clear the music queue.'),
    ),
  execute: async (interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.',
    });
  },
};
