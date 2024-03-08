import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder, SlashCommandNumberOption } from 'discord.js';
import { AppCommand } from './command';

export const volume: AppCommand = {
  data: new SlashCommandBuilder()
    .addNumberOption(
      new SlashCommandNumberOption()
        .setName('volume')
        .setRequired(true)
        .setDescription('The volume amount (maximum of 100, minimum of 0).')
    )
    .setName('volume')
    .setDescription('The volume level you want to set (maximum of 100, minimum of 0).'),
  execute: async ({ link }, interaction) => {
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

    const player = link.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    const volume = interaction.options.getNumber('volume', true);

    if (volume > 100) {
      await interaction.reply({
        ephemeral: true,
        content: `Volume should not be greater than 100.`
      });
      return;
    }

    if (volume < 0) {
      await interaction.reply({
        ephemeral: true,
        content: `Volume should not be less than zero.`
      });
      return;
    }

    await player.setVolume(volume / 100);

    await interaction.reply({
      ephemeral: true,
      content: `Volume set to \`${volume}\`.`
    });
  }
};
