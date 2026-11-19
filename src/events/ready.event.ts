import { Events } from 'discord.js';
import type { AppEvent } from './event';
import { getLogger } from '@logtape/logtape';
import { startRemoteServer } from 'vivy/remote';
import { version } from 'vivy/version';

const logger = getLogger(['vivy', 'event:ready']);

export const readyEvent: AppEvent<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  execute: async (context, client) => {
    logger.info({ message: `Ready! Logged in, v${version}`, user: client.user.tag });

    // Init link
    if (!process.env.INTERACTIONS_ONLY) {
      await context.link.init(client.user.id);
      // After the guilds are cached, requests name a guild
      await startRemoteServer(context);
    }
  }
};
