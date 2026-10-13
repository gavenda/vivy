import type { AppContext } from 'vivy/context';
import { AppEmoji } from 'vivy/emojis';
import type { Player } from 'vivy/link';
import { RadioType } from 'vivy/listen.moe';
import type { Requester } from 'vivy/requester';
import { chunk, msToTime, trimEllipse } from 'vivy/utils';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  Locale,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  TextDisplayBuilder
} from 'discord.js';
import i18next from 'i18next';

/**
 * How many queued tracks a page of the player embed shows.
 */
export const QUEUE_PAGE_SIZE = 15;

export const createPlayerQueue = ({ client, link }: AppContext, guildId: string, pageIndex = 0) => {
  const player = link.findPlayerByGuildId(guildId);
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const queue: string[] = [];

  if (player && player.queue.size > 0) {
    const tracksChunked = chunk(player.queue.toArray(), QUEUE_PAGE_SIZE);
    const tracks = tracksChunked[pageIndex];
    const maxLenStr = '' + player.queue.size;
    const maxLen = maxLenStr.length;

    if (!tracks) return;

    for (const [index, track] of tracks.entries()) {
      const title = trimEllipse(track.info.title, 100);
      const trackNo = pageIndex * QUEUE_PAGE_SIZE + (index + 1);
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

const iconButton = (customId: string, emoji: AppEmoji, style = ButtonStyle.Secondary) =>
  new ButtonBuilder().setCustomId(customId).setStyle(style).setEmoji(emoji);

const pausePlayButton = (playing: boolean) =>
  iconButton('player:play-toggle', playing ? AppEmoji.Pause : AppEmoji.Play);

const section = (text: string, accessory: ButtonBuilder) =>
  new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
    .setButtonAccessory(accessory);

/**
 * A small uppercase caption, the way every field of the embed is labelled.
 */
const caption = (key: string, lng: Locale) => `-# ${i18next.t(key, { lng }).toLocaleUpperCase(lng)}`;

interface PlayerShellOptions {
  context: AppContext;
  lng: Locale;
  player: Player<Requester> | undefined;
  nowPlaying: string;
  /**
   * Appended to the now playing caption, e.g. who requested the track.
   */
  nowPlayingSuffix?: string;
  artist: string;
  artworkUrl?: string | null;
  controls: ButtonBuilder[];
  footer: string;
}

/**
 * What every player embed shares: the title, now playing, artist and volume sections with their
 * stop, lyrics and volume buttons, the artwork, a row of controls and a footer.
 */
const buildPlayerShell = (options: PlayerShellOptions) => {
  const { context, lng, player, nowPlaying, nowPlayingSuffix = '', artist, artworkUrl, controls, footer } = options;
  const volume = player?.volume ? `${Math.round(player.volume * 100)}%` : '100%';

  const container = new ContainerBuilder();

  container.addSectionComponents(
    section(
      `-# ${context.client.user?.username.toLocaleUpperCase() ?? 'VIVY'}\n${i18next.t('about_embed.description', { lng })}`,
      iconButton('player:stop', AppEmoji.Stop, ButtonStyle.Danger)
    ),
    section(
      `${caption('player_embed.now_playing', lng)}${nowPlayingSuffix}\n${nowPlaying}`,
      iconButton('player:lyrics', AppEmoji.Lyrics)
    ),
    section(`${caption('player_embed.artist', lng)}\n${artist}`, iconButton('player:volume-up', AppEmoji.VolumeUp)),
    section(`${caption('player_embed.volume', lng)}\n${volume}`, iconButton('player:volume-down', AppEmoji.VolumeDown))
  );

  if (artworkUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(artworkUrl))
    );
  }

  container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(controls));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));

  return container;
};

export const createPlayerComponentsV2 = (context: AppContext, guildId: string, pageIndex: number = 0) => {
  const { client, link } = context;
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const player = link.findPlayerByGuildId(guildId);
  const disablePagination = (player?.queue?.size ?? 0) < QUEUE_PAGE_SIZE;
  const queue = createPlayerQueue(context, guildId, pageIndex);
  const track = player?.queue.current;

  return buildPlayerShell({
    context,
    lng,
    player,
    nowPlaying: track?.info.title ? `[${track.info.title}](${track.info.uri})` : '—',
    nowPlayingSuffix: track?.userData.userId ? ` — <@${track.userData.userId}>` : '',
    artist: track?.info.author ?? '—',
    artworkUrl: track?.info.artworkUrl,
    controls: [
      pausePlayButton(player?.playing ?? false),
      iconButton('player:skip', AppEmoji.Skip),
      iconButton('player:shuffle', AppEmoji.Shuffle),
      iconButton('player:previous', AppEmoji.Previous, ButtonStyle.Primary).setDisabled(disablePagination),
      iconButton('player:next', AppEmoji.Next, ButtonStyle.Primary).setDisabled(disablePagination)
    ],
    footer: `${caption('player_embed.queue', lng)}\n${queue}`
  });
};

export const createMusicMoeComponentsV2 = (context: AppContext, guildId: string) => {
  const { link, client, listenMoe } = context;
  const lng = client.guilds.cache.get(guildId)?.preferredLocale ?? Locale.EnglishUS;
  const player = link.findPlayerByGuildId(guildId);

  return buildPlayerShell({
    context,
    lng,
    player,
    nowPlaying: listenMoe.info.song,
    artist: listenMoe.info.artist,
    artworkUrl: listenMoe.info.cover,
    controls: [
      pausePlayButton(player?.playing ?? false),
      iconButton('player:kpop', AppEmoji.ReplaceAudio, ButtonStyle.Primary)
        .setDisabled(listenMoe.type === RadioType.KPOP)
        .setLabel('K-POP'),
      iconButton('player:jpop', AppEmoji.ReplaceAudio, ButtonStyle.Primary)
        .setDisabled(listenMoe.type === RadioType.JPOP)
        .setLabel('J-POP'),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Listen.MOE').setURL('https://listen.moe')
    ],
    footer: i18next.t('player_embed.description_listen_moe', { lng })
  });
};
