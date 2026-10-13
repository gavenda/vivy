import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const shuffle: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    player.queue.shuffle();

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.queue_shuffled', { lng: interaction.locale })
    });
  }
};
