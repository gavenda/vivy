import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'event:guild-available']);

export const guildAvailable: AppEvent<Events.GuildAvailable> = {
  event: Events.GuildAvailable,
  once: false,
  execute: async (context, guild) => {
    const { id, nameAcronym, name } = guild;

    logger.debug({ message: `Guild available`, id, nameAcronym, name });

    if (context.link.connectedNodes.length === 0) return;

    await context.link.createPlayer({
      guildId: guild.id,
      autoLeave: true
    });
  }
};
