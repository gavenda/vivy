import type { AppContext } from '@app/context';
import { LavalinkSource, LoadResultType, Player } from '@app/link';
import { logger } from '@app/logger';
import { handleQueueSelection, handleSearch, handleTracks } from '@app/player/handlers';
import type { Requester } from '@app/requester';
import { handleSpotifyAlbum, handleSpotifyPlaylist, handleSpotifyTrack } from '@app/spotify/handlers';
import { hasVoiceState, isSpotify, trimEllipse } from '@app/utils';
import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import i18next from 'i18next';
import { parse as parseSpotifyUri } from 'spotify-uri';
import type { AppCommand } from './command';

export const play: AppCommand = {
  data: new SlashCommandBuilder()
    .addStringOption(
      new SlashCommandStringOption()
        .setName('query')
        .setDescription('The music or url you want to play.')
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName('source')
        .setDescription('The source for your query.')
        .addChoices(
          { name: 'Youtube Music', value: LavalinkSource.YOUTUBE_MUSIC },
          { name: 'Youtube', value: LavalinkSource.YOUTUBE }
        )
    )
    .setName('play')
    .setDescription('Play a music or queue it in the music queue.')
    .toJSON(),
  execute: async (context, interaction) => {
    const source = <LavalinkSource>interaction.options.getString('source') ?? LavalinkSource.YOUTUBE_MUSIC;
    await playMusic({ context, interaction, source });
  },
  autocomplete: async (context, interaction) => {
    const focusedValue = interaction.options.getFocused();

    const queriesRegExp = /\["(.+?(?="))".+?(?=]])]]/g;
    const queriesUrl = new URL(`https://suggestqueries-clients6.youtube.com/complete/search`);

    queriesUrl.search = new URLSearchParams({
      client: 'youtube',
      ds: 'yt',
      q: focusedValue,
      cp: '10'
    }).toString();

    const response = await fetch(queriesUrl);
    const responseBody = await response.text();
    const matchResults = [...responseBody.matchAll(queriesRegExp)];
    const results = matchResults.map((matchResult) => matchResult[1]);
    const choices = results
      .map((result) => {
        return {
          name: trimEllipse(result, 100),
          value: trimEllipse(result, 100)
        };
      })
      .slice(0, 25);
    await interaction.respond(choices);
  }
};

const playMusic = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  source: LavalinkSource;
}) => {
  const { context, interaction, source } = options;

  if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
    await interaction.reply({
      content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
      ephemeral: true
    });
    return;
  }
  if (!hasVoiceState(interaction.member)) {
    await interaction.reply({
      content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
      ephemeral: true
    });
    return;
  }
  if (!interaction.member.voice.channel) {
    await interaction.reply({
      content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
      ephemeral: true
    });
    return;
  }

  // Passed the guards, defer (might be delayed)
  await interaction.deferReply({ ephemeral: true });

  const { link } = context;
  const query = interaction.options.getString('query', true);
  const player = await link.createPlayer({
    guildId: interaction.guild.id,
    autoLeave: true
  });

  // Connect to the voice channel if not connected
  if (!player.connected) {
    await player.connect(interaction.member.voice.channel.id);
    logger.debug(`Connected to voice channel: ${interaction.member.voice.channel.name}`);
  }

  if (isSpotify(query)) {
    await handleSpotify({ query, player, context, interaction });
  } else {
    await handleQuery({ query, player, context, interaction, source });
  }
};

const handleQuery = async (
  options: {
    query: string;
    player: Player<Requester>;
    context: AppContext;
    interaction: ChatInputCommandInteraction;
    source: LavalinkSource;
  },
  retry = true,
  retryCount = 5
) => {
  const { link } = options.context;
  const { query, interaction, player, source } = options;

  const result = await link.search({
    query,
    source,
    userData: {
      userId: interaction.user.id,
      textChannelId: interaction.channelId
    }
  });

  switch (result.loadType) {
    case LoadResultType.ERROR: {
      // Attempt to retry if search fails
      if (retry) {
        logger.debug('Error in track lookup, attempting to retry', { retryCount });

        setTimeout(async () => {
          await handleQuery(options, retryCount !== 0, retryCount - 1);
        }, 1000);
      } else {
        logger.debug('Give up in searching track', { retryCount });
        // Responding with an error message if loading fails
        await interaction.followUp({
          ephemeral: true,
          content: i18next.t('reply.error_lookup', { lng: interaction.locale })
        });
      }
      break;
    }
    case LoadResultType.EMPTY: {
      // Responding with a message if the search returns no results
      await interaction.followUp({
        ephemeral: true,
        content: i18next.t('reply.error_no_match', { lng: interaction.locale })
      });
      return;
    }
    case LoadResultType.PLAYLIST: {
      if (!result) return;
      // Handle playlist result
      await handleTracks({
        interaction,
        player,
        tracks: result.data.tracks,
        name: result.data.info.name
      });
      break;
    }
    case LoadResultType.TRACK: {
      // Handle track result
      await handleQueueSelection({ interaction, track: result.data, player });
      break;
    }
    case LoadResultType.SEARCH: {
      // Handle search result
      await handleSearch({ interaction, query, player, result });
      break;
    }
  }
};

const handleSpotify = async (options: {
  query: string;
  player: Player<Requester>;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
}) => {
  const { query, interaction, player, context } = options;
  const spotifyUri = parseSpotifyUri(query);

  switch (spotifyUri.type) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'album': {
      await handleSpotifyAlbum({ context, interaction, spotifyUri, player });
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'track': {
      await handleSpotifyTrack({ context, interaction, spotifyUri, player });
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'playlist': {
      await handleSpotifyPlaylist({ context, interaction, spotifyUri, player });
      break;
    }
  }
};
