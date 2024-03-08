import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command';

export const stop: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the currently playing music.'),
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

    player.queue.clear();
    await player.stop();
    await player.destroy();

    await interaction.reply({
      ephemeral: true,
      content: 'Music stopped.'
    });
  }
};
