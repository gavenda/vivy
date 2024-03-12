import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { createListenMoeComponents, createListenMoeEmbed, createPlayerComponents, createPlayerEmbed } from './embed';
import { LISTEN_MOE_STREAMS } from '@app/listen.moe';
import { MoonlinkTrack } from 'moonlink.js';

export const updatePlayer = async (context: AppContext, guildId: string) => {
  const { client, redis, link } = context;
  const playerEmbed = await redis.get(`player:embed:${guildId}`);

  if (!playerEmbed) return;

  const player = link.players.get(guildId);
  const track = player?.current as MoonlinkTrack;
  const isListenMoe = LISTEN_MOE_STREAMS.includes(track?.identifier ?? '');

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
  }
};
