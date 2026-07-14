import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { getLogger } from '@logtape/logtape';
import { version } from 'vivy/version';

const logger = getLogger(['vivy', 'event:ready']);

export const readyEvent: AppEvent<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  execute: async ({ link }, client) => {
    logger.info({ message: `Ready! Logged in, v${version}`, user: client.user.tag });

    // Init link
    if (!process.env.INTERACTIONS_ONLY) {
      await link.init(client.user.id);
    }
  }
};
