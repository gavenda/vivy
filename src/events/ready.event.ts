import { Events } from 'discord.js';
import { AppEvent } from './event';
import { logger } from '@/logger';

export const readyEvent: AppEvent<Events.ClientReady> = {
  event: Events.ClientReady,
  once: true,
  execute: async ({ moon, redis }, client) => {
    logger.info(`Ready! Logged in`, { user: client.user.tag });

    // Init moon
    await moon.init(client.user.id);

    // Cleanup legacy players
    const legacyPlayers = await redis.sMembers(`player:legacy`);

    for (const legacyPlayer of legacyPlayers) {
      try {
        const [legacyChannelId, legacyMessageId] = legacyPlayer.split(':');
        const legacyChannel = await client.channels.fetch(legacyChannelId);

        if (legacyChannel?.isTextBased()) {
          const legacyMessage = await legacyChannel.messages.fetch(legacyMessageId);

          if (legacyMessage.author.id === client?.user?.id) {
            logger.debug('Removing legacy message', { legacyMessageId });
            await legacyMessage.delete();
          }
        }
      } catch (error) {
        logger.warn('An error removing legacy player', { error });
      }
    }
  }
};
