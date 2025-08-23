import { createPlayerEmbed } from '@app/player';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppCommand } from './command';

export const queue: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const playerEmbed = createPlayerEmbed(context, interaction.guildId);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [playerEmbed]
    });
  }
};
