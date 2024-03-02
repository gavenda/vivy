import { Events } from 'discord.js';
import { commands } from '../commands.js';
import { AppEvent } from './event.js';

export const chatInputCommandInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find((command) => command.data.name === interaction.commandName);

    const commandContext = {
      command: interaction.commandName,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    context.logger.debug(`Received interaction command`, commandContext);

    if (!command) {
      context.logger.warn(`No matching command was found`, commandContext);
      return;
    }

    try {
      await command.execute(context, interaction);
    } catch (error: any) {
      // Log error
      context.logger.error(error, commandContext);

      // Make sure we reply to the user or they get an error for no response
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true
        });
      }
    }
  }
};
