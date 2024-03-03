import { Events } from 'discord.js';
import { AppEvent } from './event';
import { logger } from '@/logger';

export const readyEvent: AppEvent<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  execute: async ({ moon }, client) => {
    logger.info(`Ready! Logged in`, { user: client.user.tag });

    // Init moon
    await moon.init(client.user.id);
  }
};
