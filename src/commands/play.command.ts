import { AppContext } from '@/app.context';
import { AppEmoji } from '@/app.emojis';
import { logger } from '@/logger';
import { hasVoiceState } from '@/utils/has-voice-state';
import { isSpotify } from '@/utils/is-spotify';
import { trimEllipse } from '@/utils/trim-ellipses';
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';
import { parse as parseSpotifyUri } from 'spotify-uri';
import { AppCommand } from './command';

export type QueueType = 'later' | 'next' | 'now';

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
    volume: 100
  });

  if (player.voiceChannel !== interaction.member.voice.channel.id) {
    // Set to voice channel if not matching
    player.setVoiceChannel(interaction.member.voice.channel.id);
  }
  if (player.textChannel !== interaction.channelId) {
    // Set text channel if not matching
    player.setTextChannel(interaction.channelId);
  }
  if (!player.connected) {
    // Connect to the voice channel if not connected
    player.connect({ setMute: false, setDeaf: false });
  }

  if (isSpotify(query)) {
    await handleSpotify({ query, player, context, interaction, queue });
  } else {
    await handleYoutube({ query, player, context, interaction, queue });
  }

  if (!player.playing && !player.paused && player.current) {
    await player.play();
  }
};

const handleYoutube = async (options: {
  query: string;
  player: MoonlinkPlayer;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
  queue: QueueType;
}) => {
  const { link } = options.context;
  const { query, interaction, queue, player } = options;

  const result = await link.search({
    query,
    source: 'youtube',
    requester: `<@${interaction.user.id}>`
  });

  switch (result.loadType) {
    case 'error': {
      // Responding with an error message if loading fails
      await interaction.followUp({
        ephemeral: true,
        content: `There was an error looking up the music. Please try again.`
      });
      return;
    }
    case 'empty': {
      // Responding with a message if the search returns no results
      await interaction.followUp({
        ephemeral: true,
        content: `No matches found!`
      });
      return;
    }
    case 'playlist': {
      if (queue !== 'later') {
        await interaction.followUp({
          ephemeral: true,
          content: `Trying to load an entire playlist on priority is cheating.`
        });
        return;
      }

      if (!result.playlistInfo) return;

      for (const track of result.tracks) {
        player.queue.add(track);
      }

      await interaction.followUp({
        ephemeral: true,
        content: `Queueing music list: \`${result.playlistInfo.name}\`.`
      });
      break;
    }
    case 'track': {
      await respondToPlay({ interaction, track: result.tracks[0], player, queue });
      break;
    }
    case 'search': {
      const selectMusicMenu = new StringSelectMenuBuilder()
        .setCustomId(`select:music`)
        .setPlaceholder('Please select music to play');

      for (const [index, track] of result.tracks.entries()) {
        selectMusicMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(trimEllipse(track.title, 100))
            .setDescription(trimEllipse(track.author, 100))
            .setValue(track.identifier)
            .setEmoji(index === 0 ? AppEmoji.Preferred : AppEmoji.MusicNote)
        );
      }

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMusicMenu);

      const response = await interaction.followUp({
        components: [row]
      });

      try {
        const selectTrack = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: (i) => i.user.id === interaction.user.id,
          time: 60_000
        });
        const selectedIdentifier = selectTrack.values[0];
        const selectedTrack = result.tracks.find(
          (track) => track.identifier === selectedIdentifier
        );

        if (!selectedTrack) {
          await interaction.editReply({
            content: `Unable to find selected track.`,
            components: []
          });
          return;
        }

        logger.debug('Track selected', selectedTrack);

        await respondToPlay({ interaction, track: selectedTrack, player, queue });
      } catch (e) {
        await interaction.editReply({
          content: 'No music selected within a minute, cancelled.',
          components: []
        });
        return;
      }
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
  const { spotify } = context;
  const spotifyUri = parseSpotifyUri(query);

  switch (spotifyUri.type) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'album': {
      if (queue !== 'later') {
        await interaction.followUp({
          ephemeral: true,
          content: `Trying to load an entire album on priority is cheating.`
        });
        return;
      }

      const spotifyAlbum = await spotify.albums.get(spotifyUri.id);

      for (const spotifyTrack of spotifyAlbum.tracks.items) {
        const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
        const track = await lookupTrack({
          query: `${spotifyTrack.name} ${spotifyArtists}`,
          interaction,
          context
        });

        if (track) {
          player.queue.add(track);
        }
      }

      await interaction.followUp({
        ephemeral: true,
        content: `Queueing spotify album \`${spotifyAlbum.name}\``
      });

      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'track': {
      const spotifyTrack = await spotify.tracks.get(spotifyUri.id);
      const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
      const track = await lookupTrack({
        query: `${spotifyTrack.name} ${spotifyArtists}`,
        interaction,
        context
      });

      if (track) {
        await respondToPlay({ interaction, track, player, queue });
      } else {
        await interaction.followUp({
          ephemeral: true,
          content: `There was an error looking up the music. Please try again.`
        });
      }
      break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    case 'playlist': {
      if (queue !== 'later') {
        await interaction.followUp({
          ephemeral: true,
          content: `Trying to load an entire playlist on priority is cheating.`
        });
        return;
      }

      const playlistInfo = await spotify.playlists.getPlaylist(spotifyUri.id);

      for (const playlistedSpotifyTrack of playlistInfo.tracks.items) {
        const spotifyTrack = playlistedSpotifyTrack.track;
        const spotifyArtists = spotifyTrack.artists.map((artist) => artist.name).join(' ');
        const track = await lookupTrack({
          query: `${spotifyTrack.name} ${spotifyArtists}`,
          interaction,
          context
        });

        if (track) {
          player.queue.add(track);
        }
      }

      await interaction.followUp({
        ephemeral: true,
        content: `Queueing spotify playlist \`${playlistInfo.name}\``
      });

      break;
    }
  }
};

const lookupTrack = async (options: {
  query: string;
  context: AppContext;
  interaction: ChatInputCommandInteraction;
}): Promise<MoonlinkTrack | null> => {
  const { link } = options.context;
  const { query, interaction } = options;
  const result = await link.search({
    query,
    source: 'youtube',
    requester: `<@${interaction.user.id}>`
  });

  switch (result.loadType) {
    case 'error': {
      logger.warn('Lookup error', { query });
      return null;
    }
    case 'empty': {
      logger.warn('Lookup returned', { query });
      return null;
    }
    case 'search': {
      return result.tracks[0];
    }
  }

  return null;
};

const respondToPlay = async (options: {
  interaction: ChatInputCommandInteraction;
  track: MoonlinkTrack;
  player: MoonlinkPlayer;
  queue: QueueType;
}) => {
  const { interaction, track, player, queue } = options;

  switch (queue) {
    case 'later': {
      player.queue.add(track);

      if (!player.playing && !player.current) {
        await interaction.editReply({
          content: `Now playing \`${track.title}\`.`,
          components: []
        });
      } else {
        await interaction.editReply({
          content: `Playing later \`${track.title}\`.`,
          components: []
        });
      }
      break;
    }
    case 'next': {
      player.queue.add(track, 1);

      if (!player.playing && !player.current) {
        await interaction.editReply({
          content: `Now playing \`${track.title}\`.`,
          components: []
        });
      } else {
        await interaction.editReply({
          content: `Playing next \`${track.title}\`.`,
          components: []
        });
      }
      break;
    }
    case 'now': {
      await player.play(track);

      if (player.previous) {
        const previousTrack = player.previous as MoonlinkTrack;
        player.queue.add(previousTrack, 1);
      }

      await interaction.editReply({
        content: `Now playing \`${track.title}\`.`,
        components: []
      });
      break;
    }
  }
};
