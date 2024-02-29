import { SlashCommandBuilder } from 'discord.js';
import { jukebox } from '../jukebox.js';
import { AppCommand } from './command.js';

export const pause: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the playing music.'),
  execute: async (interaction) => {
    const player = jukebox.moon.players.get(interaction.guildId);

    player.pause();

    await interaction.reply({
      ephemeral: true,
      content: 'Music resumed.',
    });
  },
};
