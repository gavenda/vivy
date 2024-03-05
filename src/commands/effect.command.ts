import { AppContext } from '@/app.context';
import { logger } from '@/logger';
import { hasVoiceState } from '@/utils/has-voice-state';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js';
import { AppCommand } from './command';
import { MoonlinkPlayer } from 'moonlink.js';

export const effect: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommandGroup(
      new SlashCommandSubcommandGroupBuilder()
        .setName('filter')
        .setDescription('Apply an audio effect to the playing music.')
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('nightcore')
            .setDescription('Apply a nightcore effect to the playing music.')
            .addIntegerOption(
              new SlashCommandIntegerOption()
                .setName('speed')
                .setDescription('The nightcore speed set (maximum of 300, minimum of 10).')
            )
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('karaoke')
            .setDescription('Apply a karaoke effect to the playing music.')
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
    )
    .setName('effect')
    .setDescription('Apply an effect to the playing music.'),
  execute: async (context, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: `You are not in a guild.`,
        ephemeral: true
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: `Illegal attempt for a non gateway interaction request.`,
        ephemeral: true
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: `You are not in a voice channel.`,
        ephemeral: true
      });
      return;
    }

    const { link } = context;
    const player = link.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    const group = interaction.options.getSubcommandGroup(true);

    switch (group) {
      case 'filter': {
        await handleFilter({ context, player, interaction });
        break;
      }
      case 'equalizer': {
        await handleEqualizer({ context, player, interaction });
        break;
      }
    }
  }
};

const handleFilter = async (options: {
  context: AppContext;
  player: MoonlinkPlayer;
  interaction: ChatInputCommandInteraction;
}) => {
  const { interaction, player } = options;
  const subcommand = interaction.options.getSubcommand(true);

  switch (subcommand) {
    case 'nightcore': {
      const speed = interaction.options.getInteger('speed') ?? 105;

      if (speed > 300) {
        await interaction.reply({
          ephemeral: true,
          content: 'Speed should not be greater than 300.'
        });
        return;
      }
      if (speed < 10) {
        await interaction.reply({
          ephemeral: true,
          content: 'Speed should not be less than 10.'
        });
        return;
      }

      player.filters.setTimescale({ rate: speed / 100 });
      break;
    }
    case 'karaoke': {
      player.filters.setKaraoke({
        level: 1.0,
        monoLevel: 1.0,
        filterBand: 220.0,
        filterWidth: 100.0
      });
      break;
    }
    default:
      logger.warn('Unknown filter passed', { subcommand });
      return;
  }

  await interaction.reply({
    ephemeral: true,
    content: 'Filter applied.'
  });
};

const handleEqualizer = async (options: {
  context: AppContext;
  player: MoonlinkPlayer;
  interaction: ChatInputCommandInteraction;
}) => {
  const { interaction, player } = options;
  const subcommand = interaction.options.getSubcommand(true);

  switch (subcommand) {
    case 'rock': {
      player.filters.setEqualizer([
        { band: 0, gain: 0.3 },
        { band: 1, gain: 0.25 },
        { band: 2, gain: 0.2 },
        { band: 3, gain: 0.1 },
        { band: 4, gain: 0.05 },
        { band: 5, gain: -0.05 },
        { band: 6, gain: -0.15 },
        { band: 7, gain: -0.2 },
        { band: 8, gain: -0.1 },
        { band: 9, gain: -0.05 },
        { band: 10, gain: 0.05 },
        { band: 11, gain: 0.1 },
        { band: 12, gain: 0.2 },
        { band: 13, gain: 0.25 },
        { band: 14, gain: 0.3 }
      ]);
      break;
    }
    case 'pop': {
      player.filters.setEqualizer([
        { band: 0, gain: -0.25 },
        { band: 1, gain: 0.48 },
        { band: 2, gain: 0.59 },
        { band: 3, gain: 0.72 },
        { band: 4, gain: 0.56 },
        { band: 5, gain: 0.15 },
        { band: 6, gain: -0.24 },
        { band: 7, gain: -0.24 },
        { band: 8, gain: -0.16 },
        { band: 9, gain: -0.16 }
      ]);
      break;
    }
    default:
      logger.warn('Unknown equalizer passed', { subcommand });
      return;
  }

  await interaction.reply({
    ephemeral: true,
    content: 'Equalizer applied.'
  });
};
