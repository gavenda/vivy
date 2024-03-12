import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { ButtonInteraction, ChatInputCommandInteraction, StringSelectMenuInteraction } from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';

export const handleTrack = async (options: {
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction;
  track: MoonlinkTrack;
  player: MoonlinkPlayer;
  queue: QueueType;
}) => {
  const { interaction, track, player, queue } = options;

  logger.debug(`Handling track, queue type: ${queue}`);

  switch (queue) {
    case 'later': {
      if (!player.current) {
        await player.play(track);
      } else {
        player.queue.add(track);
      }
      break;
    }
    case 'next': {
      if (!player.current) {
        await player.play(track);
      } else {
        player.queue.add(track, 0);
      }
      break;
    }
    case 'now': {
      await player.play(track);

      if (player.previous) {
        player.queue.add(player.previous as MoonlinkTrack);
      }
      break;
    }
  }

  await interaction.editReply({
    content: i18next.t('reply.music_queued', { lng: interaction.locale, track: track.title }),
    components: []
  });
};
