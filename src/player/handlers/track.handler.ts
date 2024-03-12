import { Player, Track } from '@app/link';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { Requester } from '@app/requester';
import { ButtonInteraction, ChatInputCommandInteraction, StringSelectMenuInteraction } from 'discord.js';
import i18next from 'i18next';

export const handleTrack = async (options: {
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction;
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
    content: i18next.t('reply.music_queued', { lng: interaction.locale, track: track.info.title }),
    components: []
  });
};
