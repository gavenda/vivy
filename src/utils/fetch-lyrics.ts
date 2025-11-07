import { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from 'discord.js';
import type { Track } from 'vivy/link';
import type { Requester } from 'vivy/requester';

const LYRICS_BASE_URL = `https://lyrics.lewdhutao.my.eu.org/v2/youtube/lyrics`;

interface LyricsResult {
  data: { lyrics: string };
}

export const fetchLyricsComponents = async (track: Track<Requester>) => {
  const { info } = track;
  const { author, title } = info;

  const url = new URL(LYRICS_BASE_URL);

  url.searchParams.append(`title`, title);
  url.searchParams.append(`artist`, author);

  const response = await fetch(url, {
    method: 'GET'
  });

  const result = await response.json();
  const lyricsResult = result as LyricsResult;

  const container = new ContainerBuilder();

  const titleDisplay = new TextDisplayBuilder({ content: `-# TITLE\n${title}` });

  if (track.info.artworkUrl) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(titleDisplay)
      .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: track.info.artworkUrl } }));

    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(titleDisplay);
  }

  container.addTextDisplayComponents(new TextDisplayBuilder({ content: `-# ARTIST\n${author}` }));
  container.addTextDisplayComponents(new TextDisplayBuilder({ content: `-# LYRICS\n${lyricsResult.data.lyrics}` }));

  return container;
};
