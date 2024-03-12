import { AppContext } from '@app/context';
import { AppEmoji } from '@app/emojis';
import { chunk, msToTime, trimEllipse } from '@app/utils';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Locale } from 'discord.js';
import i18next from 'i18next';
import { MoonlinkTrack } from 'moonlink.js';

export const createPlayerQueue = ({ client, link }: AppContext, guildId: string, pageIndex = 0) => {
  const player = link.players.get(guildId);
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const queue: string[] = [];

  if (player && player.queue.size > 0) {
    const tracksChunked = chunk(player.queue.getQueue(), 15);
    const tracks = tracksChunked[pageIndex];

    for (const [index, track] of tracks.entries()) {
      const title = trimEllipse(track.title, 100);
      const trackNo = pageIndex * 15 + (index + 1);
      const requester = `<@${track.requester.userId}>`;
      const duration = msToTime(track.duration ?? 0);
      // # [Track Title](URL) `00:00` <@user-id>
      queue.push(
        `\`${trackNo}\` [${title}](${track.url}) \`${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}\` ${requester}`
      );
    }
  }

  return queue.length === 0 ? i18next.t('player_embed.description_queue_empty', { lng }) : queue.join('\n');
};

export const createListenMoeEmbed = (context: AppContext, guildId: string) => {
  const { link, client, listenMoe } = context;
  const player = link.players.get(guildId);
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;

  const listenMoeEmbed = new EmbedBuilder()
    .setTitle(`${client.user?.username ?? 'Vivy'} Song List`)
    .setDescription(i18next.t('player_embed.description_listen_moe', { lng }))
    .setColor(0xff015b)
    .setImage(listenMoe.info.cover)
    .setThumbnail(`https://listen.moe/_nuxt/img/logo-square-64.248c1f3.png`)
    .addFields(
      {
        name: i18next.t('player_embed.now_playing', { lng }),
        value: listenMoe.info.song,
        inline: false
      },
      {
        name: i18next.t('player_embed.artist', { lng }),
        value: listenMoe.info.artist,
        inline: false
      },
      {
        name: i18next.t('player_embed.album', { lng }),
        value: listenMoe.info.album,
        inline: false
      },
      {
        name: i18next.t('player_embed.volume', { lng }),
        value: player?.filters.volume ? `${Math.round(player?.filters.volume * 100)}%` : '100%',
        inline: true
      }
    );

  return listenMoeEmbed;
};

export const createPlayerEmbed = (context: AppContext, guildId: string, pageIndex: number = 0) => {
  const { link, client } = context;
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const player = link.players.get(guildId);
  const track = player?.current as MoonlinkTrack | undefined;
  const requester = track?.requester.userId ? `<@${track.requester.userId}>` : '-';
  const trackDuration = track?.duration ?? 0;
  const trackPosition = track?.position ?? 0;
  const durationTotal = player?.queue.getQueue().reduce((acc, track) => acc + track.duration, 0) ?? 0;
  const duration = msToTime(durationTotal);
  const remaining = msToTime(Math.max(0, trackDuration - trackPosition));
  const queue = createPlayerQueue(context, guildId, pageIndex);

  const queueEmbed = new EmbedBuilder()
    .setTitle(`${client.user?.username ?? 'Vivy'} Song List`)
    .setDescription(queue)
    .setColor(0x00ffff)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    .setImage(track?.artworkUrl ?? null)
    .addFields(
      {
        name: i18next.t('player_embed.now_playing', { lng }),
        value: track?.title ? `[${track.title}](${track.url})` : '-',
        inline: false
      },
      {
        name: i18next.t('player_embed.artist', { lng }),
        value: track?.author ?? '-',
        inline: false
      },
      {
        name: i18next.t('player_embed.duration', { lng }),
        value: `${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}`,
        inline: true
      },
      {
        name: i18next.t('player_embed.remaining', { lng }),
        value: `${String(remaining.minutes).padStart(2, '0')}:${String(remaining.seconds).padStart(2, '0')}`,
        inline: true
      },
      {
        name: i18next.t('player_embed.requester', { lng }),
        value: requester,
        inline: true
      },
      {
        name: i18next.t('player_embed.loop_track', { lng }),
        value: player?.loop === 1 ? 'Yes' : 'No',
        inline: true
      },
      {
        name: i18next.t('player_embed.loop_queue', { lng }),
        value: player?.loop === 2 ? 'Yes' : 'No',
        inline: true
      },
      {
        name: i18next.t('player_embed.volume', { lng }),
        value: player?.volume ? `${Math.round(player?.volume * 100)}%` : '100%',
        inline: true
      }
    );

  return queueEmbed;
};

export const createListenMoeComponents = ({ link }: AppContext, guildId: string): ActionRowBuilder<ButtonBuilder>[] => {
  const player = link.players.get(guildId);
  const playing = player?.playing ?? false;

  const pausePlayButton = new ButtonBuilder()
    .setCustomId('player:play-toggle')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(playing ? AppEmoji.Pause : AppEmoji.Play);
  const stopButton = new ButtonBuilder()
    .setCustomId('player:stop')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(AppEmoji.Stop);
  const volumeDownButton = new ButtonBuilder()
    .setCustomId('player:volume-down')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeDown);
  const volumeUpButton = new ButtonBuilder()
    .setCustomId('player:volume-up')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeUp);
  const listenMoeButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel('Listen.MOE')
    .setURL('https://listen.moe');

  const firstRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
    pausePlayButton,
    stopButton,
    volumeDownButton,
    volumeUpButton,
    listenMoeButton
  );

  return [firstRow];
};

export const createPlayerComponents = ({ link }: AppContext, guildId: string): ActionRowBuilder<ButtonBuilder>[] => {
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
