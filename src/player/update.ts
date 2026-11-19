import type { AppContext } from 'vivy/context';

import { createPlayerEmbed } from './embed';
import { clearPlayerEmbed, getPlayerEmbed, getPlayerPage, setPlayerPage } from './store';
import pDebounce from 'p-debounce';
import { MessageFlags } from 'discord.js';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'update']);

const updatePlayerNow = async (context: AppContext, guildId: string) => {
  const { client } = context;
  const playerEmbed = await getPlayerEmbed(guildId);

  if (!playerEmbed) {
    logger.warn({ message: `Player embed cache is empty`, guildId });
    return;
  }

  try {
    const { channelId, messageId } = playerEmbed;
    const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));

    if (channel?.isTextBased()) {
      const message = channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId));

      // Keep the page the embed is showing, rendering the first one would leave the stored page out of step
      const container = createPlayerEmbed(context, guildId, await getPlayerPage(guildId));

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

type PlayerChangeListener = (guildId: string) => void;

const changeListeners = new Set<PlayerChangeListener>();

/**
 * Follows changes to a guild's player (track, queue, pause), such as for the remote control's live state.
 * @returns a function that stops following
 */
export const onPlayerChange = (listener: PlayerChangeListener) => {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
};

/**
 * Tells the followers of {@link onPlayerChange} the player changed. {@link updatePlayer} already does,
 * call this only where the player embed is re-rendered some other way.
 */
export const notifyPlayerChange = (guildId: string) => {
  for (const listener of changeListeners) listener(guildId);
};

/**
 * Debounced per guild, a single shared debounce would drop the update of every guild but the last one.
 */
export const updatePlayer = (context: AppContext, guildId: string) => {
  notifyPlayerChange(guildId);

  let update = debouncedUpdates.get(guildId);

  if (!update) {
    update = pDebounce(updatePlayerNow, 1000);
    debouncedUpdates.set(guildId, update);
  }

  return update(context, guildId);
};

/**
 * Shows the first page of the player embed again after a command changed the player, as the command dispatcher does.
 */
export const refreshPlayer = async (context: AppContext, guildId: string) => {
  await setPlayerPage(guildId, 0);
  await updatePlayer(context, guildId);
};
