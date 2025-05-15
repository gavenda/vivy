import { logger } from '@app/logger';
import { Events } from 'discord.js';
import type { AppEvent } from './event';

export const readyEvent: AppEvent<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  execute: async ({ link, redis }, client) => {
    logger.info(`Ready! Logged in`, { user: client.user.tag });

    // Init link
    await link.init(client.user.id);

    // Set logger default meta
    logger.defaultMeta = {
      bot: client.user.username
    };

    // Cleanup legacy players
    const legacyPlayersKey = `player:legacy`;
    const legacyPlayers = await redis.sMembers(legacyPlayersKey);

    for (const legacyPlayer of legacyPlayers) {
      try {
        const [legacyChannelId, legacyMessageId] = legacyPlayer.split(':');
        const legacyChannel = await client.channels.fetch(legacyChannelId);

        if (legacyChannel?.isTextBased()) {
          const legacyMessage = await legacyChannel.messages.fetch(legacyMessageId);

          if (legacyMessage.author.id === client?.user?.id) {
            logger.debug('Removing legacy message', { legacyMessageId });
            await redis.sRem(legacyPlayersKey, legacyPlayer);
            await legacyMessage.delete();
          }
        }
      } catch (error) {
        logger.warn('An error removing legacy player', { error });
      }
    }
  }
};
