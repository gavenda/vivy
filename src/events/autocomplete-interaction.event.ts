import { chatInputCommands } from '@app/commands/chat-input';
import { logger } from '@app/logger';
import { Events } from 'discord.js';
import type { AppEvent } from './event';

export const autocompleteInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isAutocomplete()) return;

    const chatInputCommand = chatInputCommands.find((command) => command.data.name === interaction.commandName);

    const autocompleteContext = {
      command: interaction.commandName,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    logger.debug(`Received autocomplete interaction`, autocompleteContext);

    if (!chatInputCommand || !chatInputCommand.autocomplete) {
      logger.warn(`No matching autocomplete interaction was found`, autocompleteContext);
      return;
    }

    try {
      await chatInputCommand.autocomplete(context, interaction);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      if (!interaction.responded) {
        await interaction.respond([]);
      }
    }
  }
};
