import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';
import { fetchLyricsComponents } from 'vivy/utils/fetch-lyrics';

export const lyrics: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Show lyrics for the playing music.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    if (!player.queue.current) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    const container = await fetchLyricsComponents(player.queue.current);

    await interaction.reply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
};
