import { Events } from 'discord.js';
import { AppEvent } from './event';
import { logger } from '@/logger';
import { createPlayerComponents, createPlayerEmbed } from '@/app.player';
import { chunkSize } from '@/utils/chunk';

export const buttonInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('player')) return;
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: `You are not in a guild.`,
        ephemeral: true
      });
      return;
    }

    const [, buttonId] = interaction.customId.split(':');
    const { moon, redis } = context;
    const player = moon.players.get(interaction.guild.id);

    if (!player) {
      await interaction.reply({
        ephemeral: true,
        content: 'I am not playing anything.'
      });
      return;
    }

    logger.debug('Received player button interaction', { buttonId });

    const pageKey = `player:page:${player.guildId}`;
    let pageIndex = Number(await redis.get(pageKey));
    const pageSize = chunkSize(player.queue.size, 15);

    logger.debug(`Page index: ${pageIndex}, page size: ${pageSize}`);

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
        await player.setVolume(Math.min(100, Math.max(0, player.volume - 10)));
        break;
      }
      case 'volume-up': {
        await player.setVolume(Math.min(100, Math.max(0, player.volume + 10)));
        break;
      }
      case 'repeat-all': {
        player.setLoop(player.loop === 0 ? 'queue' : 0);
        break;
      }
      case 'repeat-single': {
        player.setLoop(player.loop === 0 ? 'track' : 0);
        break;
      }
      case 'stop': {
        await player.stop();
        if (!player.playing) {
          await player.stop();
        }
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
