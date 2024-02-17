import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder
} from 'discord.js';
import { AppCommand } from './command.js';

export const play: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music.')
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('later')
        .setDescription('Play the music later in the music queue.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setRequired(true),
        ),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('next')
        .setDescription('Play the music next in the music queue.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setRequired(true),
        ),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('now')
        .setDescription('Play the music immediately.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setRequired(true),
        ),
    ),
  execute: async (interaction) => {
    switch (interaction.options.getSubcommand()) {
      case 'later':
        await later(interaction);
        break;
      case 'next':
        await next(interaction);
        break;
      case 'now':
        await now(interaction);
        break;
      default:
        throw new Error(`Unknown subcommand: ${interaction.options.getSubcommand()}`);
    }
  },
};

const later = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: true,
    content: 'Not yet implemented.',
  });
};

const next = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: true,
    content: 'Not yet implemented.',
  });
};

const now = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: true,
    content: 'Not yet implemented.',
  });
};
