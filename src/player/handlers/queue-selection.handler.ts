import { Player, type Track } from '@app/link';
import type { Requester } from '@app/requester';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  StringSelectMenuInteraction
} from 'discord.js';
import i18next from 'i18next';
import { QueueType } from '../queue.type';
import { handleTrack } from './track.handler';
import type { AppContext } from '@app/context';

export const handleQueueSelection = async (options: {
  context: AppContext;
  track: Track<Requester>;
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { context, track, interaction, player } = options;

  if (options.queueType !== QueueType.ASK) {
    await handleTrack({ interaction, track, player, queueType: options.queueType });
    return;
  }

  try {
    const queueLaterButton = new ButtonBuilder()
      .setCustomId('queue:later')
      .setStyle(ButtonStyle.Primary)
      .setLabel(i18next.t('button.queue_later', { lng: interaction.locale }));
    const queueNextButton = new ButtonBuilder()
      .setCustomId('queue:next')
      .setStyle(ButtonStyle.Secondary)
      .setLabel(i18next.t('button.queue_next', { lng: interaction.locale }));
    const queueNowButton = new ButtonBuilder()
      .setCustomId('queue:now')
      .setStyle(ButtonStyle.Danger)
      .setLabel(i18next.t('button.queue_now', { lng: interaction.locale }));

    const queueActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      queueLaterButton,
      queueNowButton,
      queueNextButton
    );

    if (track.info.uri) {
      const linkButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(track.info.uri)
        .setLabel('View in YouTube');

      queueActionRow.addComponents(linkButton);
    }

    const queueQuestion = await interaction.editReply({
      content: i18next.t('reply.queue_question', { lng: interaction.locale, track: track.info.title }),
      components: [queueActionRow]
    });

    const buttonClick = await queueQuestion.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && i.message.id === queueQuestion.id,
      componentType: ComponentType.Button,
      time: 15_000
    });

    const queueType = <QueueType>buttonClick.customId.split(':')[1];

    await buttonClick.deferUpdate();

    await handleTrack({ interaction: buttonClick, track, player, queueType });

    // Attempt to ask queue remember
    await handleQueueRemember({ context, interaction, queueType });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.failed_queue_question', { lng: interaction.locale }),
      components: []
    });

    await handleTrack({ interaction, track, player, queueType: QueueType.LATER });
  }
};

export const handleQueueRemember = async (options: {
  context: AppContext;
  interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction;
  queueType: QueueType;
}): Promise<ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction> => {
  const { context, interaction, queueType } = options;

  // Check prefs if we want to ask the question
  const queueQuestionAlreadyAnswered = await context.redis.get(
    `user-prefs:${interaction.user.id}:queue-question-answered`
  );

  // If answered, we do nothing
  if (queueQuestionAlreadyAnswered) {
    return interaction;
  }

  try {
    const queueRememberYes = new ButtonBuilder()
      .setCustomId('queue:remember-yes')
      .setStyle(ButtonStyle.Primary)
      .setLabel(i18next.t('button.queue_remember_yes', { lng: interaction.locale }));
    const queueRememberNo = new ButtonBuilder()
      .setCustomId('queue:remember-no')
      .setStyle(ButtonStyle.Danger)
      .setLabel(i18next.t('button.queue_remember_no', { lng: interaction.locale }));

    const queueRememberActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      queueRememberYes,
      queueRememberNo
    );

    const queueRememberQuestion = await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.queue_remember_question', { lng: interaction.locale }),
      components: [queueRememberActionRow]
    });

    const buttonClick = await queueRememberQuestion.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id && i.message.id === queueRememberQuestion.id,
      componentType: ComponentType.Button,
      time: 15_000
    });

    const answer = buttonClick.customId.split(':')[1];

    await buttonClick.deferUpdate();

    if (answer === 'remember-yes') {
      await context.redis.set(`user-prefs:${interaction.user.id}:queue-type`, queueType);
    }

    await context.redis.set(`user-prefs:${interaction.user.id}:queue-question-answered`, 1);

    await buttonClick.editReply({
      content: i18next.t('reply.queue_remember_question_success', { lng: interaction.locale }),
      components: []
    });

    return buttonClick;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: i18next.t('reply.queue_remember_question_failure', { lng: interaction.locale }),
      components: []
    });
  }

  return interaction;
};
