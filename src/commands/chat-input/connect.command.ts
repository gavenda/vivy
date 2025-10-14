import { hasVoiceState } from 'vivy/utils';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

export const connect: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Connect the player to the voice channel.')
    .toJSON(),
  execute: async ({ link }, interaction) => {
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    let player = link.findPlayerByGuildId(interaction.guildId);

    if (!player) {
      player = await link.createPlayer({
        guildId: interaction.guild.id,
        autoLeave: true
      });
    }

    await player.connect(interaction.member.voice.channel.id);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.connected_to_channel', {
        lng: interaction.locale,
        channel: interaction.member.voice.channel.name
      })
    });
  }
};
