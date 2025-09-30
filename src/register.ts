import { REST, Routes } from 'discord.js';
import { logger } from './logger';
import { messageContextMenuCommands } from './commands/message-context-menu';
import { chatInputCommands } from './commands/chat-input';

if (!process.env.TOKEN) {
  throw new Error('TOKEN is required.');
}
if (!process.env.CLIENT_ID) {
  throw new Error('CLIENT_ID is required.');
}

const rest = new REST().setToken(process.env.TOKEN);

try {
  const clientId = process.env.CLIENT_ID;

  const commandList = chatInputCommands.map((command) => command.data);
  const messageCommandList = messageContextMenuCommands.map((command) => command.data);

  const fullCommandList = [...commandList, ...messageCommandList];

  logger.info(`Started refreshing ${commandList.length} application (/) commands.`);

  await rest.put(Routes.applicationCommands(clientId), { body: fullCommandList });

  logger.info(`Successfully reloaded application (/) commands.`);
} catch (error) {
  logger.error(error);
}
