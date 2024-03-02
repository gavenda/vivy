import { AppEmoji } from '@/app.emojis.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} from 'discord.js';
import { AppCommand } from './command.js';

export const queue: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the music queue.'),
  execute: async ({ moon }, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: `You are not in a guild.`,
        ephemeral: true
      });
      return;
    }

    const player = moon.players.get(interaction.guildId);

    const pausePlayButton = new ButtonBuilder()
      .setCustomId('queue:play-toggle')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.Play);
    const skipButton = new ButtonBuilder()
      .setCustomId('queue:skip')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.Skip);
    const shuffleButton = new ButtonBuilder()
      .setCustomId('queue:shuffle')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.Shuffle);
    const volumeDownButton = new ButtonBuilder()
      .setCustomId('queue:volume-down')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.VolumeDown);
    const volumeUpButton = new ButtonBuilder()
      .setCustomId('queue:volume-up')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.VolumeUp);

    const repeatAllButton = new ButtonBuilder()
      .setCustomId('queue:repeat-all')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.RepeatAll);
    const repeatSingleButton = new ButtonBuilder()
      .setCustomId('queue:repeat-single')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(AppEmoji.RepeatSingle);
    const stopButton = new ButtonBuilder()
      .setCustomId('queue:stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(AppEmoji.Stop);
    const previousButton = new ButtonBuilder()
      .setCustomId('queue:previous')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(AppEmoji.Previous);
    const nextButton = new ButtonBuilder()
      .setCustomId('queue:next')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(AppEmoji.Next);

    const firstRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      pausePlayButton,
      skipButton,
      shuffleButton,
      volumeDownButton,
      volumeUpButton
    );
    const secondRow = new ActionRowBuilder<ButtonBuilder>().setComponents(
      repeatAllButton,
      repeatSingleButton,
      stopButton,
      previousButton,
      nextButton
    );

    const queueEmbed = new EmbedBuilder()
      .setTitle(`Vivy's Song List`)
      .setDescription(`The audience has not requested me to sing anything.`)
      .setColor(0x00ffff)
      .setImage(player?.current.artworkUrl)
      .addFields(
        { name: 'Now Playing', value: '-', inline: false },
        { name: 'Songs', value: '-', inline: true },
        { name: 'Duration', value: '-', inline: true },
        { name: 'Remaining', value: '-', inline: true },
        { name: 'Requester', value: '-', inline: true },
        { name: 'Looped (Track)', value: '-', inline: true },
        { name: 'Looped (Queue)', value: '-', inline: true },
        { name: 'Volume', value: '-', inline: true },
        { name: 'Filter(s)', value: '-', inline: true },
        { name: 'Equalizer', value: '-', inline: true }
      );

    await interaction.reply({
      ephemeral: true,
      embeds: [queueEmbed],
      components: [firstRow, secondRow]
    });
  }
};
