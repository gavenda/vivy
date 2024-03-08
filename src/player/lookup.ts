import { AppContext } from '@app/context';
import { LoadResultType, Track } from '@app/link';
import { logger } from '@app/logger';
import { Requester } from '@app/requester';
import { sleep } from '@app/utils';
import { ChatInputCommandInteraction } from 'discord.js';

export const lookupTrack = async (
  options: {
    query: string;
    context: AppContext;
    interaction: ChatInputCommandInteraction;
  },
  retry = true,
  retryCount = 5
): Promise<Track<Requester> | null> => {
  const { link } = options.context;
  const { query, interaction } = options;
  const result = await link.search(query, { requester: `<@${interaction.user.id}>` });

  switch (result.loadType) {
    case LoadResultType.ERROR: {
      if (retry) {
        logger.debug('Error in track lookup, attempting to retry', { retryCount });
        await sleep(1000);
        return await lookupTrack(options, retryCount !== 0, retryCount - 1);
      }
      logger.warn('Lookup error', { query });
      return null;
    }
    case LoadResultType.PLAYLIST: {
      return result.data.tracks[result.data.info.selectedTrack];
    }
    case LoadResultType.EMPTY: {
      logger.warn('Lookup returned', { query });
      return null;
    }
    case LoadResultType.SEARCH: {
      return result.data[0];
    }
  }

  return null;
};
