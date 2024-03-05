import { createPlayerEmbed } from '@app/player';
import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command';

export const queue: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue.'),
  execute: async (context, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: `You are not in a guild.`,
        ephemeral: true
      });
      return;
    }

    const playerEmbed = createPlayerEmbed(context, interaction.guildId);

    await interaction.reply({
      ephemeral: true,
      embeds: [playerEmbed]
    });
  }
};
