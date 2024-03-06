import { AppContext } from '@app/context';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { handleSearch, handleTrack, handleTracks } from '@app/player/handlers';
import {
  handleSpotifyAlbum,
  handleSpotifyPlaylist,
  handleSpotifyTrack
} from '@app/spotify/handlers';
import { hasVoiceState, isSpotify, sleep, trimEllipse } from '@app/utils';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder
} from 'discord.js';
import { MoonlinkPlayer } from 'moonlink.js';
import { parse as parseSpotifyUri } from 'spotify-uri';
import { AppCommand } from './command';

export const play: AppCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('later')
        .setDescription('Play the music later in the music queue.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('next')
        .setDescription('Play the music next in the music queue.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('now')
        .setDescription('Play the music immediately.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .setName('play')
    .setDescription('Play music.'),
  execute: async (context, interaction) => {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === 'now' || subcommand === 'next' || subcommand === 'later') {
      await playMusic({ context, interaction, queue: subcommand });
    } else {
      logger.error(`Unknown subcommand`, { subcommand });
    }
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
  queue: QueueType;
}) => {
  const { context, interaction, queue } = options;

  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      content: `You are not in a guild.`,
      ephemeral: true
    });
    return;
  }
  if (!hasVoiceState(interaction.member)) {
    await interaction.reply({
      content: `Illegal attempt for a non gateway interaction request.`,
      ephemeral: true
    });
    return;
  }
  if (!interaction.member.voice.channel) {
    await interaction.reply({
      content: `You are not in a voice channel.`,
      ephemeral: true
    });
    return;
  }

  // Passed the guards, defer (might be delayed)
  await interaction.deferReply({ ephemeral: true });

  logger.debug(`Play command, queue type: ${queue}`);

  const { link } = context;
  const query = interaction.options.getString('query', true);

  const player = link.players.create({
    guildId: interaction.guild.id,
    voiceChannel: interaction.member.voice.channel.id,
    textChannel: interaction.channelId,
    autoLeave: true,
    autoPlay: false,
    loop: 0
  });

  if (player.voiceChannel !== interaction.member.voice.channel.id) {
    // Set to voice channel if not matching
    player.setVoiceChannel(interaction.member.voice.channel.id);
  }
  if (player.textChannel !== interaction.channelId) {
    // Set text channel if not matching
    player.setTextChannel(interaction.channelId);
  }

  logger.debug(`Connecting to voice channel: ${interaction.member.voice.channel.name}`);
  // Connect to the voice channel if not connected
  player.connect({ setMute: false, setDeaf: false });

  if (isSpotify(query)) {
    await handleSpotify({ query, player, context, interaction, queue });
  } else {
    await handleYoutube({ query, player, context, interaction, queue });
  }

  if (player.paused) {
    await player.resume();
  }
  if (!player.playing) {
    await player.play();
  }
};

const handleYoutube = async (
  options: {
    query: string;
    player: MoonlinkPlayer;
    context: AppContext;
    interaction: ChatInputCommandInteraction;
    queue: QueueType;
  },
  retry = true,
  retryCount = 5
) => {
  const { link } = options.context;
  const { query, interaction, queue, player } = options;

  const result = await link.search({
    query,
    source: 'youtube',
    requester: `<@${interaction.user.id}>`
  });

  switch (result.loadType) {
    case 'error': {
      // Attempt to retry if search fails
      if (retry) {
        const count = retryCount + 1;
        await sleep(1000);
        await handleYoutube(options, count !== 5, count);
      } else {
        logger.debug('Give up in searching track', { retryCount });
        // Responding with an error message if loading fails
        await interaction.followUp({
          ephemeral: true,
          content: `There was an error looking up the music. Please try again.`
        });
      }
      break;
    }
    case 'empty': {
      // Responding with a message if the search returns no results
      await interaction.followUp({ ephemeral: true, content: `No matches found!` });
      return;
    }
    case 'playlist': {
      if (!result.playlistInfo) return;
      // Handle playlist result
      await handleTracks({
        interaction,
        player,
        queue,
        tracks: result.tracks,
        name: result.playlistInfo.name
      });
      break;
    }
    case 'track': {
      // Handle track result
      await handleTrack({ interaction, track: result.tracks[0], player, queue });
      break;
    }
    case 'search': {
      // Handle search result
      await handleSearch({ interaction, player, queue, result });
      break;
    }
  }
};

const handleSpotify = async (options: {
  query: string;
  player: MoonlinkPlayer;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  queue: QueueType;
}) => {
  const { query, interaction, queue, player, context } = options;
  const spotifyUri = parseSpotifyUri(query);

  switch (spotifyUri.type) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'album': {
      await handleSpotifyAlbum({ context, interaction, spotifyUri, player, queue });
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'track': {
      await handleSpotifyTrack({ context, interaction, spotifyUri, player, queue });
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'playlist': {
      await handleSpotifyPlaylist({ context, interaction, spotifyUri, player, queue });
      break;
    }
  }
};
