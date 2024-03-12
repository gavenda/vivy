import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import { AppCommand } from './command';

export const skip: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing music.'),
  execute: async ({ link }, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }

    const player = link.getPlayer(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    if (!player.queue.current) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.nothing_playing', { lng: interaction.locale })
      });
      return;
    }

    const track = player.queue.current;

    await interaction.reply({
      ephemeral: true,
      content: i18next.t('reply.music_skipped', { lng: interaction.locale, track: track.info.title })
    });

    await player.skip();
  }
};
