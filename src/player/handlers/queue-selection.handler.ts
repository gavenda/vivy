import { Player, Track } from '@app/link';
import { Requester } from '@app/requester';
import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuInteraction
} from 'discord.js';
import { handleTrack } from './track.handler';
import { QueueType } from '../queue.type';

export const handleQueueSelection = async (options: {
  track: Track<Requester>;
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction;
  player: Player<Requester>;
}) => {
  const { interaction, player, track } = options;
  try {
    const queueLaterButton = new ButtonBuilder()
      .setCustomId('queue:later')
      .setStyle(ButtonStyle.Primary)
      .setLabel('Reserve Later');
    const queueNextButton = new ButtonBuilder()
      .setCustomId('queue:next')
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Play Next');
    const queueNowButton = new ButtonBuilder()
      .setCustomId('queue:now')
      .setStyle(ButtonStyle.Danger)
      .setLabel('Play Now');
    const linkButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(track.info.uri)
      .setLabel('View in YouTube');

    const queueActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      queueLaterButton,
      queueNowButton,
      queueNextButton,
      linkButton
    );

    const selectionReply = await interaction.editReply({
      content: `You have selected \`${track.info.title}\`. How would you like this to be queued?`,
      components: [queueActionRow]
    });

    const buttonClick = await selectionReply.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && i.message.id === selectionReply.id,
      componentType: ComponentType.Button,
      time: 60_000
    });

    const queue = <QueueType>buttonClick.customId.split(':')[1];

    await handleTrack({ interaction, track, player, queue });
  } catch (e) {
    await interaction.editReply({
      content: `You didn't specify how to queue within a minute, will be playing it later.`,
      components: []
    });

    await handleTrack({ interaction, track, player, queue: 'later' });
    return;
  }
};
