import { Events, MessageFlags } from 'discord.js';
import type { AppEvent } from './event';
import { modalSubmitHandlers } from 'vivy/handlers/modals';
import i18next from 'i18next';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'event:modal-submit']);

export const modalSubmitInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isModalSubmit()) return;

    const modalSubmitHandler = modalSubmitHandlers.find((command) => command.customId === interaction.customId);

    const modalSubmitContext = {
      customId: interaction.customId,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    logger.debug({ message: `Received modal submit interaction`, modalSubmitContext });

    if (!modalSubmitHandler) {
      logger.warn({ message: `No matching modal submit interaction was found`, modalSubmitContext });
      return;
    }

    try {
      await modalSubmitHandler.handle(context, interaction);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      logger.error(error, modalSubmitContext);

      // Make sure we reply to the user or they get an error for no response
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: i18next.t('reply.error_command_execution', { lng: interaction.locale }),
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: i18next.t('reply.error_command_execution', { lng: interaction.locale }),
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
