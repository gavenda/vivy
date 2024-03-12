import { ChatInputCommandInteraction } from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';

export const handleTracks = async (options: {
  tracks: MoonlinkTrack[];
  name: string;
  player: MoonlinkPlayer;
  interaction: ChatInputCommandInteraction;
}) => {
  const { tracks, interaction, player, name } = options;

  for (const track of tracks) {
    player.queue.add(track);
  }

  if (!interaction.replied) {
    await interaction.followUp({
      ephemeral: true,
      content: i18next.t('reply.music_queued', { lng: interaction.locale, track: name })
    });
  }

  if (!player.current) {
    await player.play();
  }
};
