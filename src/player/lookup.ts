import type { AppContext } from 'vivy/context';
import { LavalinkSource, LoadResultType, type Lavalink, type SearchOptions, type Track } from 'vivy/link';

import type { Requester } from 'vivy/requester';
import { sleep } from 'vivy/utils';
import { ChatInputCommandInteraction } from 'discord.js';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'lookup']);

const SEARCH_RETRIES = 5;
const SEARCH_RETRY_DELAY_MS = 1000;

/**
 * Searches, retrying while the node answers with a load error.
 * Resolves with the last result once it succeeds or the retries run out, so the caller still sees the error.
 */
export const searchWithRetry = async (link: Lavalink<Requester>, options: SearchOptions<Requester>) => {
  let result = await link.search(options);

  for (let retry = 1; retry <= SEARCH_RETRIES && result.loadType === LoadResultType.ERROR; retry++) {
    logger.debug('Error in track lookup, attempting to retry', { query: options.query, retry });

    await sleep(SEARCH_RETRY_DELAY_MS);
    result = await link.search(options);
  }

  return result;
};

export const lookupTrack = async (options: {
  query: string;
  source: LavalinkSource;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
}): Promise<Track<Requester> | undefined> => {
  const { link } = options.context;
  const { query, interaction } = options;
  const result = await link.search({
    query,
    userData: {
      userId: interaction.user.id,
      userName: interaction.user.username,
      textChannelId: interaction.channelId
    },
    source: LavalinkSource.YOUTUBE_MUSIC
  });

  switch (result.loadType) {
    case LoadResultType.ERROR: {
      logger.warn('Lookup error', { query });
      return;
    }
    case LoadResultType.PLAYLIST: {
      return result.data.tracks[result.data.info.selectedTrack];
    }
    case LoadResultType.EMPTY: {
      logger.warn('Lookup returned empty', { query });
      return;
    }
    case LoadResultType.SEARCH: {
      return result.data[0];
    }
  }
};
