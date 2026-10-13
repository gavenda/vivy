import { Player, type Track } from 'vivy/link';

import { enqueueTrack, QueueType } from 'vivy/player';
import type { Requester } from 'vivy/requester';
import { ButtonInteraction, ChatInputCommandInteraction, StringSelectMenuInteraction } from 'discord.js';
import i18next from 'i18next';

export const handleTrack = async (options: {
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction;
  track: Track<Requester>;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { interaction, track, player, queueType } = options;

  if (!(await enqueueTrack(player, track, queueType))) return;

  await interaction.editReply({
    content: i18next.t('reply.music_queued', { lng: interaction.locale, track: track.info.title }),
    components: []
  });
};
