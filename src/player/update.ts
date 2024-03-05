import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { createPlayerComponents, createPlayerEmbed } from './embed';

export const updatePlayer = async (context: AppContext, guildId: string) => {
  const { client, redis } = context;
  const player = await redis.get(`player:${guildId}`);

  if (!player) return;

  try {
    const [channelId, messageId] = player.split(':');
    const channel =
      client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));

    if (channel?.isTextBased()) {
      const message =
        channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId));

      const playerEmbed = createPlayerEmbed(context, guildId);
      const playerComponents = createPlayerComponents(context, guildId);

      await message.edit({
        embeds: [playerEmbed],
        components: playerComponents
      });
    }
  } catch (error) {
    logger.error(`Unable to send player update`, { guildId, error });
  }
};
