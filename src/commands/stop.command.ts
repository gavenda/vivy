import { SlashCommandBuilder } from 'discord.js';
import { jukebox } from '../jukebox.js';
import { AppCommand } from './command.js';

export const stop: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the currently playing music.'),
  execute: async (interaction) => {
    const player = jukebox.moon.players.get(interaction.guildId);

    player.stop();

    await interaction.reply({
      ephemeral: true,
      content: 'Music stopped.',
    });
  },
};
