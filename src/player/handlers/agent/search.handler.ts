import { Player, type SearchLoadResult } from 'vivy/link';

import type { Requester } from 'vivy/requester';
import type { Message, OmitPartialGroupDMChannel } from 'discord.js';
import type { QueueType } from '../../queue.type';
import { handleTrack } from './track.handler';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'handler:search']);

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

  logger.debug('Track selected', { track });

  await handleTrack({ message, track, player, queueType });
};
