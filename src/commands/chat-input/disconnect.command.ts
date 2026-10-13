import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const disconnect: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the player from the voice channel.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    await player.disconnect();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.disconnected_from_channel', { lng: interaction.locale })
    });
  }
};
