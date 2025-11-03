import { chatInputCommands } from 'vivy/commands/chat-input';

import { updatePlayer } from 'vivy/player';
import { Events, MessageFlags } from 'discord.js';
import i18next from 'i18next';
import type { AppEvent } from './event';
import { redis } from 'bun';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'event:chat-input-command']);

export const chatInputCommandInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isChatInputCommand()) return;

    const chatInputCommand = chatInputCommands.find((command) => command.data.name === interaction.commandName);

    const commandContext = {
      command: interaction.commandName,
      user: interaction.user.tag,
      userId: interaction.user.id
    };

    logger.debug({ message: `Received chat input interaction`, commandContext });

    if (!chatInputCommand) {
      logger.warn({ message: `No matching chat input interaction was found`, commandContext });
      return;
    }

    try {
      await chatInputCommand.execute(context, interaction);
      // Update player after every command
      if (interaction.guildId) {
        const pageKey = `player:page:${interaction.guildId}`;
        await redis.set(pageKey, '0');
        await updatePlayer(context, interaction.guildId);
      }
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
