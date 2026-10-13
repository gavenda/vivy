import { isAutoplayEnabled, setAutoplay } from 'vivy/stats/preference';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

export const autoplay: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay based on what this server likes to listen to.')
    .toJSON(),
  execute: async (_context, interaction) => {
    if (!interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const enabled = !(await isAutoplayEnabled(interaction.guildId));

    await setAutoplay(interaction.guildId, enabled);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t(enabled ? 'reply.autoplay_on' : 'reply.autoplay_off', { lng: interaction.locale })
    });
  }
};
