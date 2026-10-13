import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const resume: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused music.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    await player.resume();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.music_resumed', { lng: interaction.locale })
    });
  }
};
