import { Player, type SearchLoadResult } from '@app/link';
import { logger } from '@app/logger';
import type { Requester } from '@app/requester';
import type { Message, OmitPartialGroupDMChannel } from 'discord.js';
import type { QueueType } from '../../queue.type';
import { handleTrack } from './track.handler';

export const handleSearch = async (options: {
  query: string;
  message: OmitPartialGroupDMChannel<Message<boolean>>;
  result: SearchLoadResult<Requester>;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { result, player, message, queueType } = options;
  const track = result.data[0];

  if (!track) {
    return;
  }

  logger.debug('Track selected', track);

  await handleTrack({ message, track, player, queueType });
};
