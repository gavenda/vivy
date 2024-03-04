import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js';
import { AppCommand } from './command';
import { hasVoiceState } from '@/utils/has-voice-state';

export const clear: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommandGroup(
      new SlashCommandSubcommandGroupBuilder()
        .setName('effect')
        .setDescription('Clear an applied effect to the playing music.')
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('effect')
            .setDescription('Clear an applied effect to the playing music.')
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('filter')
            .setDescription('Clear the applied filter(s) to the playing music.')
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName('equalizer')
            .setDescription('Clear the applied equalizer(s) to the playing music.')
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder().setName('queue').setDescription('Clear the music queue.')
    )
    .setName('clear')
    .setDescription('Clear an existing applied setting.'),
  execute: async ({ magma }, interaction) => {
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

    const player = magma.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    player.queue.clear();

    await interaction.reply({
      ephemeral: true,
      content: 'Queue cleared.'
    });
  }
};
