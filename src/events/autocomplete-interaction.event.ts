import { Events } from 'discord.js';
import { commands } from '@/commands.js';
import { AppEvent } from './event.js';
import { logger } from '@/logger.js';

export const autocompleteInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      logger.error(error, autocompleteContext);

      if (!interaction.responded) {
        await interaction.respond([]);
      }
    }
  }
};
