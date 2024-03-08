import { SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import { AppCommand } from './command';
import { hasVoiceState } from '@app/utils';

export const remove: AppCommand = {
  data: new SlashCommandBuilder()
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('from')
        .setDescription('The first number of the music in the queue you want to remove.')
        .setRequired(true)
    )
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('to')
        .setDescription('The last number of the music in the queue you want to remove.')
    )
    .setName('remove')
    .setDescription('Remove a music in the music queue.'),
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

    const player = link.getPlayer(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    const from = Math.max(0, interaction.options.getInteger('from', true) - 1);
    const to = interaction.options.getInteger('to');

    if (from >= player.queue.size) {
      await interaction.reply({
        ephemeral: true,
        content: `Position should not be greater than or equal to queue size.`
      });
      return;
    }

    if (to) {
      if (from >= to) {
        await interaction.reply({
          ephemeral: true,
          content: `Minimum position should not be greater than maximimum.`
        });
        return;
      }

      player.queue.slice(from, to);

      await interaction.reply({
        ephemeral: true,
        content: `Removed music \`${from}\` to \`${to}\` from queue.`
      });
    } else {
      const track = player.queue.peek(from);

      if (!track) {
        await interaction.reply({
          ephemeral: true,
          content: `Invalid range given.`
        });
        return;
      }

      player.queue.slice(from + 1);

      await interaction.reply({
        ephemeral: true,
        content: `Removed \`${track.info.title}\` from queue.`
      });
    }
  }
};
