import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder } from 'discord.js';
import { MoonlinkTrack } from 'moonlink.js';
import { AppCommand } from './command';

export const skip: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing music.'),
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

    if (!player.current) {
      await interaction.reply({
        ephemeral: true,
        content: 'There is nothing playing.'
      });
      return;
    }

    const track = player.current as MoonlinkTrack;

    await interaction.reply({
      ephemeral: true,
      content: `Skipped \`${track.title}\``
    });

    await player.skip();
  }
};
