import {
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js';
import { AppCommand } from './command';

export const effect: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommandGroup(
      new SlashCommandSubcommandGroupBuilder()
        .setName('filter')
        .setDescription('Apply a filter effect to the playing music.')
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('nightcore')
            .setDescription('Apply a nightcore filter effect to the playing music.')
            .addIntegerOption(
              new SlashCommandIntegerOption()
                .setName('speed')
                .setDescription('The nightcore speed set (maximum of 300, minimum of 10).')
            )
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('karaoke')
            .setDescription('Apply a karaoke filter effect to the playing music.')
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('vaporwave')
            .setDescription('Apply a vaporwave filter effect to the playing music.')
        )
    )
    .addSubcommandGroup(
      new SlashCommandSubcommandGroupBuilder()
        .setName('equalizer')
        .setDescription('Apply an equalizer effect to the playing music.')
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('rock')
            .setDescription('Apply a rock equalizer to the playing music.')
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('pop')
            .setDescription('Apply a pop equalizer to the playing music.')
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('bass-boost')
            .setDescription('Apply a bass boost equalizer to the playing music.')
        )
    )
    .setName('effect')
    .setDescription('Apply an effect to the playing music.'),
  execute: async (context, interaction) => {
    await interaction.reply({
      ephemeral: true,
      content: 'Not yet implemented.'
    });
  }
};
