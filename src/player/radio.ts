import type { AppContext } from 'vivy/context';
import { LoadResultType, type Player } from 'vivy/link';
import { LISTEN_MOE_JPOP_M38U, LISTEN_MOE_KPOP_M38U, RadioType } from 'vivy/listen.moe';
import type { Requester } from 'vivy/requester';

/**
 * Replaces whatever the player is playing with a Listen.MOE radio.
 * Resolves with whether the radio was loaded and started.
 */
export const playRadio = async (
  context: AppContext,
  player: Player<Requester>,
  radioType: RadioType,
  requester: Requester
): Promise<boolean> => {
  const loadResult = await context.link.search({
    query: radioType === RadioType.JPOP ? LISTEN_MOE_JPOP_M38U : LISTEN_MOE_KPOP_M38U,
    userData: requester
  });

  if (loadResult.loadType !== LoadResultType.TRACK) return false;

  await player.queue.clear();
  await player.stop();
  await player.play(loadResult.data);

  return true;
};
