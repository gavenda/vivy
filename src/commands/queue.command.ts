import { createPlayerEmbed } from '@app/player';
import { SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import { AppCommand } from './command';

export const queue: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue.'),
  execute: async (context, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
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
