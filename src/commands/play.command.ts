import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { jukebox } from '../jukebox.js';
import { AppCommand } from './command.js';

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
            .setRequired(true),
        ),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('next')
        .setDescription('Play the music next in the music queue.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setRequired(true),
        ),
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('now')
        .setDescription('Play the music immediately.')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('query')
            .setDescription('The music or url you want to play.')
            .setRequired(true),
        ),
    )
    .setName('play')
    .setDescription('Play music.'),
  execute: async (interaction) => {
    switch (interaction.options.getSubcommand()) {
      case 'later':
        await later(interaction);
        break;
      case 'next':
        await next(interaction);
        break;
      case 'now':
        await now(interaction);
        break;
      default:
        throw new Error(`Unknown subcommand: ${interaction.options.getSubcommand()}`);
    }
  },
};

const hasVoiceState = (member: any): member is GuildMember => {
  return member.voice !== undefined;
};

const later = async (interaction: ChatInputCommandInteraction) => {
  const member = interaction.member;

  if (!hasVoiceState(member)) {
    await interaction.reply({
      content: `Illegal attempt for a non gateway interaction request.`,
      ephemeral: true,
    });
    return;
  }
  if (!member.voice.channel) {
    await interaction.reply({
      content: `You are not in a voice channel.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const query = interaction.options.getString('query');
  const player = jukebox.moon.players.create({
    guildId: interaction.guild.id,
    voiceChannel: member.voice.channel.id,
    textChannel: interaction.channel.id,
    autoPlay: true,
  });

  if (!player.connected) {
    // Connecting to the voice channel if not already connected
    player.connect({});
  }

  const result = await jukebox.moon.search({
    query,
    source: 'youtube',
    requester: interaction.user.id,
  });

  switch (result.loadType) {
    case 'error':
      // Responding with an error message if loading fails
      await interaction.followUp({
        ephemeral: true,
        content: `There was an error loading the music.`,
      });
      break;
    case 'empty':
      // Responding with a message if the search returns no results
      await interaction.followUp({
        ephemeral: true,
        content: `No matches found!`,
      });
      break;
    case 'playlist':
      await interaction.followUp({
        ephemeral: true,
        content: `Playing later music list: \`${result.playlistInfo.name}\`.`,
      });

      for (const track of result.tracks) {
        // Adding tracks to the queue if it's a playlist
        player.queue.add(track);
      }
      break;
    case 'search':
      const selectMusicMenu = new StringSelectMenuBuilder()
        .setCustomId(`select:music`)
        .setPlaceholder('Select music to play!');

      for (const track of result.tracks) {
        selectMusicMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(track.title)
            .setDescription(track.author)
            .setValue(track.identifier),
        );
      }

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMusicMenu);

      const response = await interaction.followUp({
        components: [row],
      });

      try {
        const selectTrack = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: (i) => i.user.id === member.id,
          time: 60_000,
        });
        const selectedIdentifier = selectTrack.values[0];
        const selectedTrack = result.tracks.find(
          (track) => track.identifier === selectedIdentifier,
        );

        player.queue.add(selectedTrack);

        await interaction.editReply({
          content: `Now playing \`${selectedTrack.title}\`.`,
          components: [],
        });
      } catch (e) {
        await interaction.editReply({
          content: 'No music selected within a minute, cancelled.',
          components: [],
        });
      }
      break;
  }

  if (!player.playing) {
    // Starting playback if not already playing
    player.play();
  }
};

const next = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: true,
    content: 'Not yet implemented.',
  });
};

const now = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: true,
    content: 'Not yet implemented.',
  });
};
