import { RepeatMode } from '@app/link';
import { logger } from '@app/logger';
import { createPlayerComponents, createPlayerEmbed } from '@app/player';
import { chunkSize } from '@app/utils';
import { Events } from 'discord.js';
import i18next from 'i18next';
import type { AppEvent } from './event';

export const buttonInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('player')) return;
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        ephemeral: true
      });
      return;
    }
    const { link, redis } = context;
    const player = link.getPlayer(interaction.guild.id);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    const [, buttonId] = interaction.customId.split(':');
    const volume = player.volume;

    logger.debug('Received player button interaction', { buttonId });

    const pageKey = `player:page:${player.guildId}`;
    let pageIndex = Number(await redis.get(pageKey));
    const pageSize = chunkSize(player.queue.size, 15);

    switch (buttonId) {
      case 'play-toggle': {
        if (player.playing) {
          await player.pause();
        } else {
          await player.resume();
        }
        break;
      }
      case 'skip': {
        await player.skip();
        break;
      }
      case 'shuffle': {
        player.queue.shuffle();
        break;
      }
      case 'volume-down': {
        await player.applyVolume(Math.min(1, Math.max(0, volume - 0.1)));
        break;
      }
      case 'volume-up': {
        await player.applyVolume(Math.min(1, Math.max(0, volume + 0.1)));
        break;
      }
      case 'repeat-track': {
        player.repeatMode = player.repeatMode === RepeatMode.TRACK ? RepeatMode.OFF : RepeatMode.TRACK;
        break;
      }
      case 'repeat-queue': {
        player.repeatMode = player.repeatMode === RepeatMode.QUEUE ? RepeatMode.OFF : RepeatMode.QUEUE;
        break;
      }
      case 'stop': {
        await player.queue.clear();
        await player.stop();
        break;
      }
      case 'previous': {
        pageIndex--;

        if (pageIndex < 0) {
          pageIndex = pageSize - 1;
        }
        break;
      }
      case 'next': {
        pageIndex++;

        if (pageIndex >= pageSize) {
          pageIndex = 0;
        }
        break;
      }
    }

    const playerEmbed = createPlayerEmbed(context, interaction.guildId, pageIndex);
    const playerComponents = createPlayerComponents(context, interaction.guildId);
    await redis.set(pageKey, pageIndex);
    await interaction.update({
      embeds: [playerEmbed],
      components: playerComponents
    });
  }
};
