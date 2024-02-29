import { SlashCommandBuilder } from 'discord.js';
import { jukebox } from '../jukebox.js';
import { AppCommand } from './command.js';

export const resume: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused music.'),
  execute: async (interaction) => {
    const player = jukebox.moon.players.get(interaction.guildId);

    player.resume();

    await interaction.reply({
      ephemeral: true,
      content: 'Music resumed.',
    });
  },
};
