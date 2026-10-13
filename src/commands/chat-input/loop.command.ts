import { RepeatMode } from 'vivy/link';
import { MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const loop: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder().setName('track').setDescription('Loop the current playing music.')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('queue').setDescription('Loop the entire music queue.'))
    .setName('loop')
    .setDescription('Loop the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'track':
        player.repeatMode = RepeatMode.TRACK;

        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.loop_track', { lng: interaction.locale })
        });
        break;
      case 'queue':
        player.repeatMode = RepeatMode.QUEUE;

        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.loop_queue', { lng: interaction.locale })
        });
        break;
    }
  }
};
