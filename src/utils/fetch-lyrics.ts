import { ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } from 'discord.js';
import type { Track } from 'vivy/link';
import type { Requester } from 'vivy/requester';

const LYRICS_BASE_URL = `https://lyrics.lewdhutao.my.eu.org/v2/youtube/lyrics`;

interface LyricsResult {
  data: {
    trackName: string;
    lyrics: string;
  };
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

  if (lyricsResult.data.trackName != title) {
    return new TextDisplayBuilder({ content: 'No lyrics found for this track.' });
  }

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

  const lyrics = truncateString(lyricsResult.data.lyrics, 2000);

  container.addTextDisplayComponents(new TextDisplayBuilder({ content: `-# ARTIST\n${author}` }));
  container.addTextDisplayComponents(new TextDisplayBuilder({ content: `-# LYRICS\n${lyrics}` }));

  return container;
};

function truncateString(str: string, maxLength: number, ellipsis = '...') {
  if (str.length <= maxLength) {
    return str;
  } else {
    // Adjust maxLength to account for the ellipsis if needed
    const effectiveMaxLength = maxLength - ellipsis.length;
    if (effectiveMaxLength < 0) {
      // Handle cases where maxLength is too small for ellipsis
      return str.slice(0, maxLength);
    }
    return str.slice(0, effectiveMaxLength) + ellipsis;
  }
}
