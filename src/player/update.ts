import type { AppContext } from 'vivy/context';
import { LISTEN_MOE_STREAMS } from 'vivy/listen.moe';

import { createMusicMoeComponentsV2, createPlayerComponentsV2 } from './embed';
import pDebounce from 'p-debounce';
import { MessageFlags } from 'discord.js';
import { redis } from 'bun';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'update']);

export const updatePlayerNow = async (context: AppContext, guildId: string) => {
  const { client, link } = context;
  const playerEmbedKey = `player:embed:${guildId}`;
  const playerEmbed = await redis.get(playerEmbedKey);

  if (!playerEmbed) {
    logger.warn({ message: `Player embed cache is empty`, playerEmbedKey });
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
    logger.error({ message: `Unable to send player update`, guildId, error });
    await redis.del(playerEmbedKey);
    logger.debug({ message: `Removing embed key from cache`, playerEmbedKey });
  }
};

export const updatePlayer = pDebounce(updatePlayerNow, 1000);
