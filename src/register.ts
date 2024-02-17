import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

import dotenv from 'dotenv';
import { logger } from './logger.js';

// Load environment variables
dotenv.config();

const rest = new REST().setToken(process.env.TOKEN);

try {
  const clientId = process.env.CLIENT_ID;

  const commandList = commands.map((command) => command.data.toJSON());

  logger.info(`Started refreshing ${commandList.length} application (/) commands.`);

  await rest.put(Routes.applicationCommands(clientId), { body: commandList });

  logger.info(`Successfully reloaded application (/) commands.`);
} catch (error) {
  logger.error(error);
}
