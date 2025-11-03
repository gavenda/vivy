import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'event:guild-unavailable']);

export const guildUnavailable: AppEvent<Events.GuildUnavailable> = {
  event: Events.GuildUnavailable,
  once: false,
  execute: async (context, guild) => {
    logger.debug({ message: `Guild unavailable`, guild });

    if (context.link.connectedNodes.length === 0) return;

    const player = context.link.findPlayerByGuildId(guild.id);

    if (!player) return;

    await player.destroy();
  }
};
