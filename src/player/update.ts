import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { createListenMoeComponents, createListenMoeEmbed, createPlayerComponents, createPlayerEmbed } from './embed';
import { LISTEN_MOE_STREAMS } from '@app/listen.moe';

export const updatePlayer = async (context: AppContext, guildId: string) => {
  const { client, redis, link } = context;
  const playerEmbedKey = `player:embed:${guildId}`;
  const playerEmbed = await redis.get(playerEmbedKey);

  if (!playerEmbed) return;

  const player = link.getPlayer(guildId);
  const isListenMoe = LISTEN_MOE_STREAMS.includes(player?.queue?.current?.info?.identifier ?? '');

  try {
    const [channelId, messageId] = playerEmbed.split(':');
    const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));

    if (channel?.isTextBased()) {
      const message = channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId));

      const playerEmbed = isListenMoe ? createListenMoeEmbed(context, guildId) : createPlayerEmbed(context, guildId);
      const playerComponents = isListenMoe
        ? createListenMoeComponents(context, guildId)
        : createPlayerComponents(context, guildId);

      await message.edit({
        embeds: [playerEmbed],
        components: playerComponents
      });
    }
  } catch (error) {
    logger.error(`Unable to send player update`, { guildId, error });
    await redis.del(playerEmbedKey);
    logger.info(`Removing embed key from cache`, { playerEmbedKey });
  }
};
