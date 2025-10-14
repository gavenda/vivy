import type { AppContext } from 'vivy/context';
import { AppEmoji } from 'vivy/emojis';
import { RadioType } from 'vivy/listen.moe';
import { chunk, msToTime, trimEllipse } from 'vivy/utils';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  EmbedBuilder,
  Locale,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  TextDisplayBuilder
} from 'discord.js';
import i18next from 'i18next';

export const createPlayerQueue = ({ client, link }: AppContext, guildId: string, pageIndex = 0) => {
  const player = link.findPlayerByGuildId(guildId);
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const queue: string[] = [];

  if (player && player.queue.size > 0) {
    const tracksChunked = chunk(player.queue.toArray(), 15);
    const tracks = tracksChunked[pageIndex];
    const maxLenStr = '' + player.queue.size;
    const maxLen = maxLenStr.length;

    if (!tracks) return;

    for (const [index, track] of tracks.entries()) {
      const title = trimEllipse(track.info.title, 100);
      const trackNo = pageIndex * 15 + (index + 1);
      const trackNoText = '' + trackNo;
      const requester = `<@${track.userData.userId}>`;
      const duration = msToTime(track.info.length ?? 0);
      // # `00:00` [Track Title](URL) <@user-id>
      queue.push(
        `\`${trackNoText.padStart(maxLen, '0')}\` \`${String(duration.minutes).padStart(2, '0')}:${String(duration.seconds).padStart(2, '0')}\` [${title}](${track.info.uri}) ${requester}`
      );
    }
  }

  return queue.length === 0 ? i18next.t('player_embed.description_queue_empty', { lng }) : queue.join('\n');
};

export const createPlayerComponentsV2 = (context: AppContext, guildId: string, pageIndex: number = 0) => {
  const { client, link } = context;
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const player = link.findPlayerByGuildId(guildId);
  const playing = player?.playing ?? false;
  const disablePagination = (player?.queue?.size ?? 0) < 15;
  const queue = createPlayerQueue(context, guildId, pageIndex);
  const track = player?.queue.current;
  const requester = track?.userData.userId ? ` — <@${track.userData.userId}>` : '';
  const nowPlaying = track?.info.title ? `[${track?.info.title}](${track?.info.uri})` : '—';
  const artist = track?.info.author ?? '—';

  const container = new ContainerBuilder();

  const stopButton = new ButtonBuilder()
    .setCustomId('player:stop')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(AppEmoji.Stop);
  const volumeUpButton = new ButtonBuilder()
    .setCustomId('player:volume-up')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeUp);
  const volumeDownButton = new ButtonBuilder()
    .setCustomId('player:volume-down')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeDown);
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

  const titleSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${client.user?.username.toLocaleUpperCase() ?? 'VIVY'}\n${i18next.t('about_embed.description', { lng })}`
      )
    )
    .setButtonAccessory(stopButton);

  const nowPlayingSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${i18next.t('player_embed.now_playing', { lng }).toLocaleUpperCase(lng)}${requester}\n${nowPlaying}`
      )
    )
    .setButtonAccessory(volumeUpButton);

  const artistSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${i18next.t('player_embed.artist', { lng }).toLocaleUpperCase(lng)}\n${artist}`
      )
    )
    .setButtonAccessory(volumeDownButton);

  const mediaControlActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    pausePlayButton,
    skipButton,
    shuffleButton,
    previousButton,
    nextButton
  );

  const queueTextDisplay = new TextDisplayBuilder().setContent(
    `-# ${i18next.t('player_embed.queue', { lng }).toLocaleUpperCase(lng)}\n${queue}`
  );

  container.addSectionComponents(titleSection);
  container.addSectionComponents(nowPlayingSection);
  container.addSectionComponents(artistSection);

  if (track?.info.artworkUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(track.info.artworkUrl))
    );
  }

  container.addActionRowComponents(mediaControlActionRow);
  container.addTextDisplayComponents(queueTextDisplay);

  return container;
};

export const createMusicMoeComponentsV2 = (context: AppContext, guildId: string) => {
  const { link, client, listenMoe } = context;
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const player = link.findPlayerByGuildId(guildId);
  const playing = player?.playing ?? false;

  const container = new ContainerBuilder();

  const stopButton = new ButtonBuilder()
    .setCustomId('player:stop')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(AppEmoji.Stop);
  const volumeUpButton = new ButtonBuilder()
    .setCustomId('player:volume-up')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeUp);
  const volumeDownButton = new ButtonBuilder()
    .setCustomId('player:volume-down')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(AppEmoji.VolumeDown);
  const pausePlayButton = new ButtonBuilder()
    .setCustomId('player:play-toggle')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(playing ? AppEmoji.Pause : AppEmoji.Play);
  const kPopButton = new ButtonBuilder()
    .setCustomId('player:kpop')
    .setDisabled(listenMoe.type === RadioType.KPOP)
    .setStyle(ButtonStyle.Primary)
    .setEmoji(AppEmoji.ReplaceAudio)
    .setLabel('K-POP');
  const jPopButton = new ButtonBuilder()
    .setCustomId('player:jpop')
    .setDisabled(listenMoe.type === RadioType.JPOP)
    .setStyle(ButtonStyle.Primary)
    .setEmoji(AppEmoji.ReplaceAudio)
    .setLabel('J-POP');
  const listenMoeButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Link)
    .setLabel('Listen.MOE')
    .setURL('https://listen.moe');

  const titleSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${client.user?.username.toLocaleUpperCase() ?? 'VIVY'}\n${i18next.t('about_embed.description', { lng })}`
      )
    )
    .setButtonAccessory(stopButton);

  const nowPlayingSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${i18next.t('player_embed.now_playing', { lng }).toLocaleUpperCase(lng)}\n${listenMoe.info.song}`
      )
    )
    .setButtonAccessory(volumeUpButton);

  const artistSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${i18next.t('player_embed.artist', { lng }).toLocaleUpperCase(lng)}\n${listenMoe.info.artist}`
      )
    )
    .setButtonAccessory(volumeDownButton);

  const mediaControlActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    pausePlayButton,
    kPopButton,
    jPopButton,
    listenMoeButton
  );

  const queueTextDisplay = new TextDisplayBuilder().setContent(
    i18next.t('player_embed.description_listen_moe', { lng })
  );

  container.addSectionComponents(titleSection);
  container.addSectionComponents(nowPlayingSection);
  container.addSectionComponents(artistSection);

  if (listenMoe.info.cover) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(listenMoe.info.cover))
    );
  }

  container.addActionRowComponents(mediaControlActionRow);
  container.addTextDisplayComponents(queueTextDisplay);

  return container;
};

export const createListenMoeEmbed = (context: AppContext, guildId: string) => {
  const { link, client, listenMoe } = context;
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const player = link.findPlayerByGuildId(guildId);

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
        value: player?.volume ? `${Math.round(player?.volume * 100)}%` : '100%',
        inline: true
      }
    );

  return listenMoeEmbed;
};
