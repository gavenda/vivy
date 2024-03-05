import { AppContext } from '@app/context';
import { QueueType } from '@app/player';
import { handleTracks } from '@app/player/handlers';
import { lookupTrack } from '@app/player/lookup';
import { ChatInputCommandInteraction } from 'discord.js';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';
import { ParsedSpotifyUri } from 'spotify-uri';

export const handleSpotifyPlaylist = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  spotifyUri: ParsedSpotifyUri;
  player: MoonlinkPlayer;
  queue: QueueType;
}) => {
  const { context, interaction, player, queue, spotifyUri } = options;
  const { spotify } = context;

  if (queue !== 'later') {
    await interaction.followUp({
      ephemeral: true,
      content: `Trying to load an entire playlist on priority is cheating.`
    });
    return;
  }

  const spotifyPlaylist = await spotify.playlists.getPlaylist(spotifyUri.id);
  const tracks: MoonlinkTrack[] = [];

  for (const { track: spotifyTrack } of spotifyPlaylist.tracks.items) {
    const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
    const track = await lookupTrack({
      query: `${spotifyTrack.name} ${spotifyArtists}`,
      interaction,
      context
    });

    if (track) {
      tracks.push(track);
    }
  }

  await handleTracks({ tracks, name: spotifyPlaylist.name, queue, player, interaction });
};
