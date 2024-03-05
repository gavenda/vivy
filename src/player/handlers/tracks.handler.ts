import { QueueType } from '@app/player';
import { ChatInputCommandInteraction } from 'discord.js';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';

export const handleTracks = async (options: {
  tracks: MoonlinkTrack[];
  name: string;
  queue: QueueType;
  player: MoonlinkPlayer;
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

  for (const track of tracks) {
    player.queue.add(track);
  }

  await interaction.followUp({
    ephemeral: true,
    content: `Queued \`${name}\`.`
  });

  if (player.queue.size <= 0 && !player.current) {
    await player.play();
  }
};
