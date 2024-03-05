import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { ChatInputCommandInteraction } from 'discord.js';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';

export const handleTrack = async (options: {
  interaction: ChatInputCommandInteraction;
  track: MoonlinkTrack;
  player: MoonlinkPlayer;
  queue: QueueType;
}) => {
  const { interaction, track, player, queue } = options;

  logger.debug(`Handling track, queue type: ${queue}`);

  switch (queue) {
    case 'later': {
      if (player.queue.size <= 0 && !player.current) {
        await player.play(track);
      } else {
        player.queue.add(track);
      }
      break;
    }
    case 'next': {
      if (player.queue.size <= 0 && !player.current) {
        await player.play(track);
      } else {
        player.queue.add(track, 1);
      }
      break;
    }
    case 'now': {
      await player.play(track);

      if (player.previous) {
        const previousTrack = player.previous as MoonlinkTrack;
        player.queue.add(previousTrack, 1);
      }
      break;
    }
  }

  await interaction.editReply({
    content: `Queued \`${track.title}\`.`,
    components: []
  });
};
