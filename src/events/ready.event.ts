import { logger } from '@app/logger';
import { Events } from 'discord.js';
import type { AppEvent } from './event';

export const readyEvent: AppEvent<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  execute: async ({ link }, client) => {
    logger.info(`Ready! Logged in`, { user: client.user.tag });

    // Init link
    await link.init(client.user.id);

    // Set logger default meta
    logger.defaultMeta = {
      bot: client.user.username
    };
  }
};
