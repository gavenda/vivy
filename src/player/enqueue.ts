import type { Player, Track } from 'vivy/link';
import type { Requester } from 'vivy/requester';
import { getLogger } from '@logtape/logtape';
import { QueueType } from './queue.type';

const logger = getLogger(['vivy', 'enqueue']);

/**
 * Puts the track in the player's queue the way the queue type asks for.
 * Resolves with whether it was handled, {@link QueueType.ASK} must be resolved to a concrete type beforehand.
 */
export const enqueueTrack = async (
  player: Player<Requester>,
  track: Track<Requester>,
  queueType: QueueType
): Promise<boolean> => {
  logger.debug({ message: `Handling track, queue type: ${queueType}` });

  switch (queueType) {
    case QueueType.ASK:
      logger.warn('Queue type being handled is of QueueType.ASK, this is an error and should be reported');
      return false;
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

  return true;
};

/**
 * Puts several tracks, such as a playlist, in the player's queue the way the queue type asks for, keeping their order.
 * With {@link QueueType.NOW} only the first one interrupts, the rest play right after it.
 */
export const enqueueTracks = async (
  player: Player<Requester>,
  tracks: Track<Requester>[],
  queueType: QueueType
): Promise<boolean> => {
  const [first, ...rest] = tracks;

  if (!first) return false;

  switch (queueType) {
    case QueueType.ASK:
      return enqueueTrack(player, first, queueType);
    case QueueType.LATER: {
      player.queue.enqueue(...tracks);

      if (!player.queue.current) await player.play();
      break;
    }
    case QueueType.NEXT: {
      for (const track of [...tracks].reverse()) player.queue.enqueueNext(track);

      if (!player.queue.current) await player.play();
      break;
    }
    case QueueType.NOW: {
      await enqueueTrack(player, first, queueType);

      for (const track of [...rest].reverse()) player.queue.enqueueNext(track);
      break;
    }
  }

  return true;
};
