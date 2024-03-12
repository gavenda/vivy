import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { ChatInputCommandInteraction } from 'discord.js';
import { MoonlinkTrack, SearchPlatform } from 'moonlink.js';

export const lookupTrack = async (options: {
  query: string;
  source: SearchPlatform;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
}): Promise<MoonlinkTrack | null> => {
  const { link } = options.context;
  const { query, interaction, source } = options;
  const result = await link.search({
    query,
    requester: {
      userId: interaction.user.id,
      textChannelId: interaction.channelId
    },
    source
  });

  switch (result.loadType) {
    case 'error': {
      logger.warn('Lookup error', { query });
      return null;
    }
    case 'playlist': {
      return result.playlistInfo!.selectedTrack!;
    }
    case 'empty': {
      logger.warn('Lookup returned empty', { query });
      return null;
    }
    case 'search': {
      return result.tracks[0];
    }
  }

  return null;
};
