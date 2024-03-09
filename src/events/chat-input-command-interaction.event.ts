import { commands } from '@app/commands';
import { logger } from '@app/logger';
import { updatePlayer } from '@app/player';
import { Events } from 'discord.js';
import { AppEvent } from './event';

export const chatInputCommandInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isChatInputCommand()) return;

    const command = commands.find((command) => command.data.name === interaction.commandName);

    const commandContext = {
      command: interaction.commandName,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    logger.debug(`Received interaction command`, commandContext);

    if (!command) {
      logger.warn(`No matching command was found`, commandContext);
      return;
    }

    try {
      await command.execute(context, interaction);
      // Update player after every command
      if (interaction.guildId) {
        const pageKey = `player:page:${interaction.guildId}`;
        await context.redis.set(pageKey, 0);
        await updatePlayer(context, interaction.guildId);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      logger.error(error, commandContext);

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
