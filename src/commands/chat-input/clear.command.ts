import { MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const clear: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('effect')
        .setDescription('Clear the applied effects to the playing music.')
    )
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('queue').setDescription('Clear the music queue.'))
    .setName('clear')
    .setDescription('Clear an existing applied setting.')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { player } = session;

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'queue':
        await player.queue.clear();
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.cleared_queue', { lng: interaction.locale })
        });
        break;
      case 'effect':
        await player.filter.reset();
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: i18next.t('reply.cleared_effect', { lng: interaction.locale })
        });
        break;
    }
  }
};
