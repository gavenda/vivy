import { hasVoiceState } from '@app/utils';
import { SlashCommandBuilder, SlashCommandIntegerOption } from 'discord.js';
import i18next from 'i18next';
import { AppCommand } from './command';

export const remove: AppCommand = {
  data: new SlashCommandBuilder()
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('from')
        .setDescription('The first number of the music in the queue you want to remove.')
        .setRequired(true)
    )
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName('to')
        .setDescription('The last number of the music in the queue you want to remove.')
    )
    .setName('remove')
    .setDescription('Remove a music in the music queue.'),
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

    const player = link.players.get(interaction.guildId);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    const from = Math.max(0, interaction.options.getInteger('from', true) - 1);
    const to = interaction.options.getInteger('to');

    if (from >= player.queue.size) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.position_not_greater_than_queue_size', { lng: interaction.locale })
      });
      return;
    }

    if (to) {
      if (from >= to) {
        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.position_not_greater_than_max', { lng: interaction.locale })
        });
        return;
      }

      player.queue.setQueue(player.queue.getQueue().slice(from, to));

      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.remove_track_range_from_queue', { lng: interaction.locale, from, to })
      });
    } else {
      const track = player.queue.getQueue()[from];

      if (!track) {
        await interaction.reply({
          ephemeral: true,
          content: i18next.t('reply.invalid_range', { lng: interaction.locale })
        });
        return;
      }

      player.queue.remove(from);

      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.remove_track_from_queue', { lng: interaction.locale, track: track.title })
      });
    }
  }
};
