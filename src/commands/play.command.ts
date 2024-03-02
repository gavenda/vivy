import { AppContext } from '@/app.context.js';
import { hasVoiceState } from '@/utils/has-voice-state.js';
import { trimEllipse } from '@/utils/trim-ellipses.js';
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
import { MoonlinkTrack } from 'moonlink.js';
import { AppCommand } from './command.js';
import { AppEmoji } from '@/app.emojis.js';

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
      await playMusic(context, interaction, subcommand);
    } else {
      context.logger.error(`Unknown subcommand`, { subcommand });
    }
  },
  autocomplete: async ({ logger, moon }, interaction) => {
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

const playMusic = async (
  { moon, logger }: AppContext,
  interaction: ChatInputCommandInteraction,
  queue: QueueType
) => {
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

  const query = interaction.options.getString('query', true);
  const player = moon.players.create({
    guildId: interaction.guild.id,
    voiceChannel: interaction.member.voice.channel.id,
    textChannel: interaction.channelId
  });

  if (!player.connected) {
    // Connecting to the voice channel if not already connected
    player.connect({});
  }

  const result = await moon.search({
    query,
    source: 'youtube',
    requester: interaction.user.id
  });

  switch (result.loadType) {
    case 'error':
      // Responding with an error message if loading fails
      await interaction.followUp({
        ephemeral: true,
        content: `There was an error looking up the music. Please try again.`
      });
      break;
    case 'empty':
      // Responding with a message if the search returns no results
      await interaction.followUp({
        ephemeral: true,
        content: `No matches found!`
      });
      break;
    case 'playlist':
      if (queue !== 'later') {
        await interaction.followUp({
          ephemeral: true,
          content: `Trying to load an entire playlist on priority is cheating.`
        });
        return;
      }

      for (const track of result.tracks) {
        // Adding tracks to the queue if it's a playlist
        player.queue.add(track);
      }

      await interaction.followUp({
        ephemeral: true,
        content: `Playing later music list: \`${result.playlistInfo!.name}\`.`
      });
      break;
    case 'search':
      const selectMusicMenu = new StringSelectMenuBuilder()
        .setCustomId(`select:music`)
        .setPlaceholder('Please select music to play');

      for (const [index, track] of result.tracks.entries()) {
        selectMusicMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(track.title)
            .setDescription(track.author)
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

        switch (queue) {
          case 'later':
            player.queue.add(selectedTrack);

            if (!player.playing && player.queue.size === 1) {
              await interaction.editReply({
                content: `Now playing \`${selectedTrack.title}\`.`,
                components: []
              });
            } else {
              await interaction.editReply({
                content: `Playing later \`${selectedTrack.title}\`.`,
                components: []
              });
            }
            break;
          case 'next':
            player.queue.add(selectedTrack, 0);

            if (player.playing && player.queue.size === 1) {
              await interaction.editReply({
                content: `Now playing \`${selectedTrack.title}\`.`,
                components: []
              });
            } else {
              await interaction.editReply({
                content: `Playing next \`${selectedTrack.title}\`.`,
                components: []
              });
            }
            break;
          case 'now':
            player.play(selectedTrack);

            if (player.previous instanceof MoonlinkTrack) {
              player.queue.add(player.previous, 0);
            }

            await interaction.editReply({
              content: `Now playing \`${selectedTrack.title}\`.`,
              components: []
            });
            break;
        }
      } catch (e) {
        await interaction.editReply({
          content: 'No music selected within a minute, cancelled.',
          components: []
        });
      }
      break;
  }

  if (!player.playing) {
    await player.play();
  }
};
