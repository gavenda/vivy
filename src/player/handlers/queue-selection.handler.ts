import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuInteraction
} from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer, MoonlinkTrack } from 'moonlink.js';
import { QueueType } from '../queue.type';
import { handleTrack } from './track.handler';

export const handleQueueSelection = async (options: {
  track: MoonlinkTrack;
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction;
  player: MoonlinkPlayer;
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

    const queueActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      queueLaterButton,
      queueNowButton,
      queueNextButton
    );

    if (track.url) {
      const linkButton = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(track.url).setLabel('View in YouTube');

      queueActionRow.addComponents(linkButton);
    }

    const queueQuestion = await interaction.editReply({
      content: i18next.t('reply.queue_question', { lng: interaction.locale, track: track.title }),
      components: [queueActionRow]
    });

    const buttonClick = await queueQuestion.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && i.message.id === queueQuestion.id,
      componentType: ComponentType.Button,
      time: 15_000
    });

    const queue = <QueueType>buttonClick.customId.split(':')[1];

    await buttonClick.deferUpdate();

    await handleTrack({ interaction: buttonClick, track, player, queue });
  } catch (e) {
    await interaction.followUp({
      ephemeral: true,
      content: i18next.t('reply.failed_queue_question', { lng: interaction.locale }),
      components: []
    });

    await handleTrack({ interaction, track, player, queue: 'later' });
    return;
  }
};
