import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { logger } from '@app/logger';

export const guildAvailable: AppEvent<Events.GuildAvailable> = {
  event: Events.GuildAvailable,
  once: false,
  execute: async (context, guild) => {
    logger.debug(`Guild available`, { guild });

    if (context.link.connectedNodes.length === 0) return;

    await context.link.createPlayer({
      guildId: guild.id,
      autoLeave: true
    });
  }
};
