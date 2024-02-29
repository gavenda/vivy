import { SlashCommandBuilder } from 'discord.js';
import { jukebox } from '../jukebox.js';
import { AppCommand } from './command.js';

export const disconnect: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the player from the voice channel.'),
  execute: async (interaction) => {
    const player = jukebox.moon.players.get(interaction.guildId);

    player.disconnect();

    await interaction.reply({
      ephemeral: true,
      content: 'Music resumed.',
    });
  },
};
