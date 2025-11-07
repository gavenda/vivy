import { ComponentType, ContainerBuilder } from 'discord.js';
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

  return new ContainerBuilder({
    components: [
      {
        type: ComponentType.TextDisplay,
        content: `-# TITLE\n${title}`
      },
      {
        type: ComponentType.TextDisplay,
        content: `-# ARTIST\n${author}`
      },
      {
        type: ComponentType.TextDisplay,
        content: `-# LYRICS`
      },
      {
        type: ComponentType.TextDisplay,
        content: lyricsResult.data.lyrics
      }
    ]
  });
};
