import { Player, type Track } from '@app/link';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import type { Requester } from '@app/requester';
import { ButtonInteraction, ChatInputCommandInteraction, StringSelectMenuInteraction } from 'discord.js';
import i18next from 'i18next';

export const handleTrack = async (options: {
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction;
  track: Track<Requester>;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { interaction, track, player, queueType } = options;

  logger.debug(`Handling track, queue type: ${queueType}`);

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

  await interaction.editReply({
    content: i18next.t('reply.music_queued', { lng: interaction.locale, track: track.info.title }),
    components: []
  });
};
