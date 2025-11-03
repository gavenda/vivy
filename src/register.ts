import { REST, Routes } from 'discord.js';
import { messageContextMenuCommands } from './commands/message-context-menu';
import { chatInputCommands } from './commands/chat-input';
import { getLogger } from '@logtape/logtape';

if (!process.env.TOKEN) {
  throw new Error('TOKEN is required.');
}
if (!process.env.CLIENT_ID) {
  throw new Error('CLIENT_ID is required.');
}

const logger = getLogger(['vivy', 'register']);
const rest = new REST().setToken(process.env.TOKEN);

try {
  const clientId = process.env.CLIENT_ID;

  const commandList = chatInputCommands.map((command) => command.data);
  const messageCommandList = messageContextMenuCommands.map((command) => command.data);

  const fullCommandList = [...commandList, ...messageCommandList];

  logger.info({ message: `Started refreshing ${commandList.length} application (/) commands.` });

  await rest.put(Routes.applicationCommands(clientId), { body: fullCommandList });

  logger.info({ message: `Successfully reloaded application (/) commands.` });
} catch (error) {
  logger.error({ error });
}
