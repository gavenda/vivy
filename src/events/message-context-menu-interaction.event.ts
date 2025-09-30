import { Events, MessageFlags } from 'discord.js';
import type { AppEvent } from './event';
import { messageContextMenuCommands as messageContextMenuCommands } from '@app/commands/message-context-menu';
import { logger } from '@app/logger';
import i18next from 'i18next';

export const messageContextMenuInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isMessageContextMenuCommand()) return;

    const messageContextMenuCommand = messageContextMenuCommands.find(
      (command) => command.data.name === interaction.commandName
    );

    const commandContext = {
      command: interaction.commandName,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    logger.debug(`Received message context menu interaction command`, commandContext);

    if (!messageContextMenuCommand) {
      logger.warn(`No matching message context menu interaction was found`, commandContext);
      return;
    }

    try {
      await messageContextMenuCommand.execute(context, interaction);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      logger.error(error, commandContext);

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
