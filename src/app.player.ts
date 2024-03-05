import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { AppContext } from './app.context';
import { AppEmoji } from './app.emojis';
import { logger } from './logger';
import { msToTime } from './utils/ms-to-time';
import { chunk } from './utils/chunk';
import { trimEllipse } from './utils/trim-ellipses';
import { MoonlinkTrack } from 'moonlink.js';

export const updatePlayer = async (context: AppContext, guildId: string) => {
  const { client, redis } = context;
  const player = await redis.get(`player:${guildId}`);

  if (!player) return;

  try {
    const [channelId, messageId] = player.split(':');
    const channel =
      client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId));

    if (channel?.isTextBased()) {
      const message =
        channel.messages.cache.get(messageId) ?? (await channel.messages.fetch(messageId));

      const playerEmbed = createPlayerEmbed(context, guildId);
      const playerComponents = createPlayerComponents(context, guildId);

      await message.edit({
        embeds: [playerEmbed],
        components: playerComponents
      });
    }
  } catch (error) {
    logger.error(`Unable to send player update`, { guildId, error });
  }
};

export const createPlayerQueue = ({ link }: AppContext, guildId: string, pageIndex = 0) => {
  const player = link.players.get(guildId);
  const queue: string[] = [];

  if (player && player.queue.size > 0) {
    const tracksChunked = chunk(player.queue.getQueue(), 15);
    const tracks = tracksChunked[pageIndex];

    for (const [index, track] of tracks.entries()) {
      const title = trimEllipse(track.title, 100);
      const trackNo = pageIndex * 15 + (index + 1);
      const requester = String(track?.requester) ?? '-';
      const duration = msToTime(track?.duration ?? 0);
      // # [Track Title](URL) `00:00` <@user-id>
      queue.push(
        `\`${trackNo}\` [${title}](${track.url}) \`${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}\` ${requester}`
      );
    }
  }

  return queue.length === 0
    ? 'The audience has not requested me to sing anything.'
    : queue.join('\n');
};

export const createPlayerEmbed = (context: AppContext, guildId: string, pageIndex: number = 0) => {
  const { link, client } = context;
  const player = link.players.get(guildId);
  const track = player?.current as MoonlinkTrack | undefined;
  const requester = String(track?.requester ?? '-');
  const duration = msToTime(Math.max(0, track?.duration ?? 0));
  const position = msToTime(Math.max(0, (track?.duration ?? 0) - (track?.position ?? 0) ?? 0));
  const queue = createPlayerQueue(context, guildId, pageIndex);

  const queueEmbed = new EmbedBuilder()
    .setTitle(`${client.user?.username ?? 'Vivy'} Song List`)
    .setDescription(queue)
    .setColor(0x00ffff)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .setImage(track?.artworkUrl ?? null)
    .addFields(
      {
        name: 'Now Playing',
        value: track?.title ? `[${track.title}](${track.url})` : '-',
        inline: false
      },
      {
        name: 'Duration',
        value: `${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}`,
        inline: true
      },
      {
        name: 'Remaining',
        value: `${String(position.minutes).padStart(2, '0')}:${String(position.seconds).padStart(2, '0')}`,
        inline: true
      },
      {
        name: 'Requester',
        value: requester,
        inline: true
      },
      {
        name: 'Looped (Track)',
        value: player?.loop === 1 ? 'Yes' : 'No',
        inline: true
      },
      {
        name: 'Looped (Queue)',
        value: player?.loop === 2 ? 'Yes' : 'No',
        inline: true
      },
      {
        name: 'Volume',
        value: player?.filters.volume ? `${player?.filters.volume}%` : '-',
        inline: true
      }
    );

  return queueEmbed;
};

export const createPlayerComponents = ({ link }: AppContext, guildId: string) => {
  const player = link.players.get(guildId);
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
    .setEmoji(player?.loop === 1 ? AppEmoji.RepeatQueueOn : AppEmoji.RepeatQueue);
  const repeatTrackButton = new ButtonBuilder()
    .setCustomId('player:repeat-track')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(player?.loop === 2 ? AppEmoji.RepeatTrackOn : AppEmoji.RepeatTrack);
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
