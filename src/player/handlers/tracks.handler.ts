import { Player, Track } from '@app/link';
import { Requester } from '@app/requester';
import { ChatInputCommandInteraction } from 'discord.js';

export const handleTracks = async (options: {
  tracks: Track<Requester>[];
  name: string;
  player: Player<Requester>;
  interaction: ChatInputCommandInteraction;
}) => {
  const { tracks, interaction, player, name } = options;

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
