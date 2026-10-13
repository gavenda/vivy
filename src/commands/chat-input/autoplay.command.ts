import { isAutoplayEnabled, setAutoplay } from 'vivy/stats/preference';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requireGuild } from './guards';

export const autoplay: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay based on what this server likes to listen to.')
    .toJSON(),
  execute: async (_context, interaction) => {
    const guildId = await requireGuild(interaction);

    if (!guildId) return;

    const enabled = !(await isAutoplayEnabled(guildId));

    await setAutoplay(guildId, enabled);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t(enabled ? 'reply.autoplay_on' : 'reply.autoplay_off', { lng: interaction.locale })
    });
  }
};
