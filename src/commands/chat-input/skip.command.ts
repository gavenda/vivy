import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const skip: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing music.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    if (!player.queue.current) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.nothing_playing', { lng: interaction.locale })
      });
      return;
    }

    const track = player.queue.current;

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.music_skipped', { lng: interaction.locale, track: track.info.title })
    });

    await player.skip();
  }
};
