import { hasVoiceState } from 'vivy/utils';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

export const skip: AppChatInputCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing music.')
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

    const player = link.findPlayerByGuildId(interaction.guildId);

    if (!player) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

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
