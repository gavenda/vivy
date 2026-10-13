import { createPlayerComponentsV2 } from 'vivy/player';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { AppChatInputCommand } from './chat-input-command';
import { requireGuild } from './guards';

export const queue: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    const guildId = await requireGuild(interaction);

    if (!guildId) return;

    const container = createPlayerComponentsV2(context, guildId);

    await interaction.reply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
};
