import { commands } from '@app/commands';
import { logger } from '@app/logger';
import { Events } from 'discord.js';
import { AppEvent } from './event';

export const autocompleteInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isAutocomplete()) return;

    const command = commands.find((command) => command.data.name === interaction.commandName);

    const autocompleteContext = {
      command: interaction.commandName,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    logger.debug(`Received autocomplete interaction`, autocompleteContext);

    if (!command || !command.autocomplete) {
      logger.warn(`No matching autocomplete interaction was found`, autocompleteContext);
      return;
    }

    try {
      await command.autocomplete(context, interaction);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (!interaction.responded) {
        await interaction.respond([]);
      }
    }
  }
};
