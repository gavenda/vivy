import { createPlayerComponentsV2 } from 'vivy/player';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

export const queue: AppChatInputCommand = {
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

    const container = createPlayerComponentsV2(context, interaction.guildId);

    await interaction.reply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
};
