import type { AppContext } from 'vivy/context';
import { LISTEN_MOE_STREAMS } from 'vivy/listen.moe';

import { createMusicMoeComponentsV2, createPlayerComponentsV2 } from './embed';
import { clearPlayerEmbed, getPlayerEmbed } from './store';
import pDebounce from 'p-debounce';
import { MessageFlags } from 'discord.js';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'update']);

export const updatePlayerNow = async (context: AppContext, guildId: string) => {
  const { client, link } = context;
  const playerEmbed = await getPlayerEmbed(guildId);

  if (!playerEmbed) {
    logger.warn({ message: `Player embed cache is empty`, guildId });
    return;
  }

  const player = link.findPlayerByGuildId(guildId);
  const isListenMoe = LISTEN_MOE_STREAMS.includes(player?.queue?.current?.info?.identifier ?? '');

  try {
    const { channelId, messageId } = playerEmbed;
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
    await clearPlayerEmbed(guildId);
    logger.debug({ message: `Removing embed from cache`, guildId });
  }
};

const debouncedUpdates = new Map<string, typeof updatePlayerNow>();

/**
 * Debounced per guild, a single shared debounce would drop the update of every guild but the last one.
 */
export const updatePlayer = (context: AppContext, guildId: string) => {
  let update = debouncedUpdates.get(guildId);

  if (!update) {
    update = pDebounce(updatePlayerNow, 1000);
    debouncedUpdates.set(guildId, update);
  }

  return update(context, guildId);
};
