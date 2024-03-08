import { Player, Track } from '@app/link';
import { QueueType } from '@app/player';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';

export const handleTracks = async (options: {
  tracks: Track<Requester>[];
  name: string;
  queue: QueueType;
  player: Player<Requester>;
  interaction: ChatInputCommandInteraction;
}) => {
  const { tracks, queue, interaction, player, name } = options;

  if (queue !== 'later') {
    await interaction.followUp({
      ephemeral: true,
      content: `Trying to load an entire playlist on priority is cheating.`
    });
    return;
  }

  player.queue.enqueue(...tracks);

  if (!interaction.replied) {
    await interaction.followUp({
      ephemeral: true,
      content: `Queued \`${name}\`.`
    });
  }

  if (!player.queue.current) {
    await player.play();
  }
};
