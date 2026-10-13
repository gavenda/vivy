import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const pause: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the playing music.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    await player.pause();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.music_paused', { lng: interaction.locale })
    });
  }
};
