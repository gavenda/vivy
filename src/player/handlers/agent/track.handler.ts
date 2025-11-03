import { Player, type Track } from 'vivy/link';

import { QueueType } from 'vivy/player';
import type { Requester } from 'vivy/requester';
import type { Message, OmitPartialGroupDMChannel } from 'discord.js';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'handler:track']);

export const handleTrack = async (options: {
  message: OmitPartialGroupDMChannel<Message<boolean>>;
  track: Track<Requester>;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { track, player, queueType } = options;

  logger.debug({ message: `Handling track, queue type: ${queueType}` });

  switch (queueType) {
    case QueueType.ASK:
      logger.warn('Queue type being handled is of QueueType.ASK, this is an error and should be reported');
      return;
    case QueueType.LATER: {
      if (!player.queue.current) {
        await player.play(track);
      } else {
        player.queue.enqueue(track);
      }
      break;
    }
    case QueueType.NEXT: {
      if (!player.queue.current) {
        await player.play(track);
      } else {
        player.queue.enqueueNext(track);
      }
      break;
    }
    case QueueType.NOW: {
      await player.play(track);

      if (player.queue.previous) {
        player.queue.enqueueNext(player.queue.previous);
      }
      break;
    }
  }
};
