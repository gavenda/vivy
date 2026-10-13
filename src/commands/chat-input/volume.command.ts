import { MessageFlags, SlashCommandBuilder, SlashCommandNumberOption } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const volume: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addNumberOption(
      new SlashCommandNumberOption()
        .setName('volume')
        .setRequired(true)
        .setDescription('The volume amount (maximum of 100, minimum of 0).')
    )
    .setName('volume')
    .setDescription('The volume level you want to set (maximum of 100, minimum of 0).')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    const volume = interaction.options.getNumber('volume', true);

    if (volume > 100) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.volume_not_greater_than_max', { lng: interaction.locale, max: 100 })
      });
      return;
    }

    if (volume < 0) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.volume_not_less_than_zero', { lng: interaction.locale })
      });
      return;
    }

    await player.applyVolume(volume / 100);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.volume_applied', { lng: interaction.locale, volume })
    });
  }
};
