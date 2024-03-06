import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { sleep } from '@app/utils';
import { ChatInputCommandInteraction } from 'discord.js';
import { MoonlinkTrack } from 'moonlink.js';

export const lookupTrack = async (
  options: {
    query: string;
    context: AppContext;
    interaction: ChatInputCommandInteraction;
  },
  retry = true,
  retryCount = 5
): Promise<MoonlinkTrack | null> => {
  const { link } = options.context;
  const { query, interaction } = options;
  const result = await link.search({
    query,
    source: 'youtube',
    requester: `<@${interaction.user.id}>`
  });

  switch (result.loadType) {
    case 'error': {
      if (retry) {
        const count = retryCount + 1;
        logger.debug('Error in track lookup, attempting to retry', { count });
        await sleep(1000);
        return await lookupTrack(options, count !== 5, count);
      }
      logger.warn('Lookup error', { query });
      return null;
    }
    case 'empty': {
      logger.warn('Lookup returned', { query });
      return null;
    }
    case 'search': {
      return result.tracks[0];
    }
  }

  return null;
};
