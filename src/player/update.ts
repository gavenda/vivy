import type { AppContext } from 'vivy/context';
import { LISTEN_MOE_STREAMS } from 'vivy/listen.moe';
import { logger } from 'vivy/logger';
import { createMusicMoeComponentsV2, createPlayerComponentsV2 } from './embed';
import pDebounce from 'p-debounce';
import { MessageFlags } from 'discord.js';
import { redis } from 'bun';

export const updatePlayerNow = async (context: AppContext, guildId: string) => {
  const { client, link } = context;
  const playerEmbedKey = `player:embed:${guildId}`;
  const playerEmbed = await redis.get(playerEmbedKey);

  if (!playerEmbed) {
    logger.warn(`Player embed cache is empty`, { playerEmbedKey });
    return;
  }

  const player = link.findPlayerByGuildId(guildId);
  const isListenMoe = LISTEN_MOE_STREAMS.includes(player?.queue?.current?.info?.identifier ?? '');

  try {
    const [channelId, messageId] = playerEmbed.split(':');

    if (!channelId) return;
    if (!messageId) return;

    const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));

    if (channel?.isTextBased()) {
      const message = channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId));

      const container = isListenMoe
        ? createMusicMoeComponentsV2(context, guildId)
        : createPlayerComponentsV2(context, guildId);

      await message.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  } catch (error) {
    logger.error(`Unable to send player update`, { guildId, error });
    await redis.del(playerEmbedKey);
    logger.debug(`Removing embed key from cache`, { playerEmbedKey });
  }
};

export const updatePlayer = pDebounce(updatePlayerNow, 1000);
