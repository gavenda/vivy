import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { hasVoiceState } from '@app/utils';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer } from 'moonlink.js';
import { AppCommand } from './command';

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
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }

    const { link } = context;
    const player = link.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
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
      const min = 10;
      const max = 300;
      if (speed > max) {
        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.speed_not_greater_than_max', { lng: interaction.locale, max })
        });
        return;
      }
      if (speed < min) {
        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.speed_not_less_than_min', { lng: interaction.locale, min })
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
    content: i18next.t('reply.applied_filter', { lng: interaction.locale })
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
    content: i18next.t('reply.applied_equalizer', { lng: interaction.locale })
  });
};
