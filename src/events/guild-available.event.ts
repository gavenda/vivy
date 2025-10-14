import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { logger } from 'vivy/logger';

export const guildAvailable: AppEvent<Events.GuildAvailable> = {
  event: Events.GuildAvailable,
  once: false,
  execute: async (context, guild) => {
    const { id, nameAcronym, name } = guild;

    logger.debug(`Guild available`, { id, nameAcronym, name });

    if (context.link.connectedNodes.length === 0) return;

    await context.link.createPlayer({
      guildId: guild.id,
      autoLeave: true
    });
  }
};
