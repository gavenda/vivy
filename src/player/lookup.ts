import { AppContext } from '@app/context';
import { LavalinkSource, LoadResultType, Track } from '@app/link';
import { logger } from '@app/logger';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';

export const lookupTrack = async (options: {
  query: string;
  source: LavalinkSource;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
}): Promise<Track<Requester> | null> => {
  const { link } = options.context;
  const { query, interaction } = options;
  const result = await link.search({
    query,
    userData: { requester: `<@${interaction.user.id}>` },
    source: LavalinkSource.YOUTUBE_MUSIC
  });

  switch (result.loadType) {
    case LoadResultType.ERROR: {
      logger.warn('Lookup error', { query });
      return null;
    }
    case LoadResultType.PLAYLIST: {
      return result.data.tracks[result.data.info.selectedTrack];
    }
    case LoadResultType.EMPTY: {
      logger.warn('Lookup returned empty', { query });
      return null;
    }
    case LoadResultType.SEARCH: {
      return result.data[0];
    }
  }

  return null;
};
