import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requireVoice } from './guards';

export const connect: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Connect the player to the voice channel.')
    .toJSON(),
  execute: async ({ link }, interaction) => {
    const session = await requireVoice(interaction);

    if (!session) return;

    const { guildId, voiceChannel } = session;

    let player = link.findPlayerByGuildId(guildId);

    if (!player) {
      player = await link.createPlayer({
        guildId,
        autoLeave: true
      });
    }

    await player.connect(voiceChannel.id);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.connected_to_channel', {
        lng: interaction.locale,
        channel: voiceChannel.name
      })
    });
  }
};
