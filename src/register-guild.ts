import { REST, Routes } from 'discord.js';
import { logger } from './logger';
import { chatInputCommands } from './commands/chat-input';
import { messageContextMenuCommands } from './commands/message-context-menu';

if (!process.env.TOKEN) {
  throw new Error('TOKEN is required.');
}
if (!process.env.CLIENT_ID) {
  throw new Error('CLIENT_ID is required.');
}
if (!process.env.GUILD_ID) {
  throw new Error('GUILD_ID is required.');
}

const rest = new REST().setToken(process.env.TOKEN);

try {
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  const commandList = chatInputCommands.map((command) => command.data);
  const messageCommandList = messageContextMenuCommands.map((command) => command.data);

  const fullCommandList = [...commandList, ...messageCommandList];

  logger.info(`Started refreshing ${commandList.length} application (/) commands on guild id: ${guildId}.`);

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: fullCommandList });

  logger.info(`Successfully reloaded application (/) commands on guild id: ${guildId}.`);
} catch (error) {
  logger.error(error);
}
