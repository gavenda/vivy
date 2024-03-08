import { Player, Track } from '@app/link';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';

export const handleTrack = async (options: {
  interaction: ChatInputCommandInteraction;
  track: Track<Requester>;
  player: Player<Requester>;
  queue: QueueType;
}) => {
  const { interaction, track, player, queue } = options;

  logger.debug(`Handling track, queue type: ${queue}`);

  switch (queue) {
    case 'later': {
      if (!player.queue.current) {
        await player.play(track);
      } else {
        player.queue.enqueue(track);
      }
      break;
    }
    case 'next': {
      if (!player.queue.current) {
        await player.play(track);
      } else {
        player.queue.enqueueNext(track);
      }
      break;
    }
    case 'now': {
      await player.play(track);

      if (player.queue.previous) {
        player.queue.enqueueNext(player.queue.previous);
      }
      break;
    }
  }

  await interaction.editReply({
    content: `Queued \`${track.info.title}\`.`,
    components: []
  });
};