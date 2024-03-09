import { AppContext } from '@app/context';
import { AppEmoji } from '@app/emojis';
import { RepeatMode } from '@app/link';
import { chunk, msToTime, trimEllipse } from '@app/utils';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const createPlayerQueue = ({ link }: AppContext, guildId: string, pageIndex = 0) => {
  const player = link.getPlayer(guildId);
  const queue: string[] = [];

  if (player && player.queue.size > 0) {
    const tracksChunked = chunk(player.queue.toArray(), 15);
    const tracks = tracksChunked[pageIndex];

    for (const [index, track] of tracks.entries()) {
      const title = trimEllipse(track.info.title, 100);
      const trackNo = pageIndex * 15 + (index + 1);
      const requester = `<@${track.userData.userId}>`;
      const duration = msToTime(track.info.length ?? 0);
      // # [Track Title](URL) `00:00` <@user-id>
      queue.push(
        `\`${trackNo}\` [${title}](${track.info.uri}) \`${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}\` ${requester}`
      );
    }
  }

  return queue.length === 0 ? 'The audience has not requested me to sing anything.' : queue.join('\n');
};

export const createPlayerEmbed = (context: AppContext, guildId: string, pageIndex: number = 0) => {
  const { link, client } = context;
  const player = link.getPlayer(guildId);
  const track = player?.queue.current;
  const requester = track?.userData.userId ? `<@${track.userData.userId}>` : '-';
  const duration = msToTime(player?.duration ?? 0);
  const remaining = msToTime(player?.remaining ?? 0);
  const queue = createPlayerQueue(context, guildId, pageIndex);

  const queueEmbed = new EmbedBuilder()
    .setTitle(`${client.user?.username ?? 'Vivy'} Song List`)
    .setDescription(queue)
    .setColor(0x00ffff)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .setImage(track?.info.artworkUrl ?? null)
    .addFields(
      {
        name: 'Now Playing',
        value: track?.info.title ? `[${track.info.title}](${track.info.uri})` : '-',
        inline: false
      },
      {
        name: 'Duration',
        value: `${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}`,
        inline: true
      },
      {
        name: 'Remaining',
        value: `${String(remaining.minutes).padStart(2, '0')}:${String(remaining.seconds).padStart(2, '0')}`,
        inline: true
      },
      {
        name: 'Requester',
        value: requester,
        inline: true
      },
      {
        name: 'Looped (Track)',
        value: player?.repeatMode === RepeatMode.TRACK ? 'Yes' : 'No',
        inline: true
      },
      {
        name: 'Looped (Queue)',
        value: player?.repeatMode === RepeatMode.QUEUE ? 'Yes' : 'No',
        inline: true
      },
      {
        name: 'Volume',
        value: player?.volume ? `${Math.round(player?.volume * 100)}%` : '100%',
        inline: true
      }
    );

  return queueEmbed;
};

export const createPlayerComponents = ({ link }: AppContext, guildId: string) => {
  const player = link.getPlayer(guildId);
  const playing = player?.playing ?? false;
  const disablePagination = (player?.queue?.size ?? 0) < 15;

  const pausePlayButton = new ButtonBuilder()
    .setCustomId('player:play-toggle')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(playing ? AppEmoji.Pause : AppEmoji.Play);
  const skipButton = new ButtonBuilder()
    .setCustomId('player:skip')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.Skip);
  const shuffleButton = new ButtonBuilder()
    .setCustomId('player:shuffle')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.Shuffle);
  const volumeDownButton = new ButtonBuilder()
    .setCustomId('player:volume-down')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeDown);
  const volumeUpButton = new ButtonBuilder()
    .setCustomId('player:volume-up')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeUp);

  const repeatQueueButton = new ButtonBuilder()
    .setCustomId('player:repeat-queue')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(player?.repeatMode === RepeatMode.QUEUE ? AppEmoji.RepeatQueueOn : AppEmoji.RepeatQueue);
  const repeatTrackButton = new ButtonBuilder()
    .setCustomId('player:repeat-track')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(player?.repeatMode === RepeatMode.TRACK ? AppEmoji.RepeatTrackOn : AppEmoji.RepeatTrack);
  const stopButton = new ButtonBuilder()
    .setCustomId('player:stop')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(AppEmoji.Stop);
  const previousButton = new ButtonBuilder()
    .setCustomId('player:previous')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(AppEmoji.Previous)
    .setDisabled(disablePagination);
  const nextButton = new ButtonBuilder()
    .setCustomId('player:next')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(AppEmoji.Next)
    .setDisabled(disablePagination);

  const firstRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
    pausePlayButton,
    skipButton,
    shuffleButton,
    volumeDownButton,
    volumeUpButton
  );
  const secondRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
    repeatQueueButton,
    repeatTrackButton,
    stopButton,
    previousButton,
    nextButton
  );

  return [firstRow, secondRow];
};
