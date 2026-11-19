import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { getLogger } from '@logtape/logtape';
import { isAutoplayEnabled } from 'vivy/stats/preference';

const logger = getLogger(['vivy', 'event:guild-available']);

export const guildAvailable: AppEvent<Events.GuildAvailable> = {
  event: Events.GuildAvailable,
  once: false,
  execute: async (context, guild) => {
    const { id, nameAcronym, name } = guild;

    logger.debug({ message: `Guild available`, id, nameAcronym, name });

    // Read once, so the remote control's state can tell whether autoplay is on
    try {
      await isAutoplayEnabled(id);
    } catch (error) {
      logger.warn({ message: 'Unable to read autoplay', id, error });
    }

    if (context.link.connectedNodes.length === 0) return;

    await context.link.createPlayer({
      guildId: guild.id,
      autoLeave: true
    });
  }
};
