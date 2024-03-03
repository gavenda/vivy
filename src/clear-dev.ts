import { REST, Routes } from 'discord.js';
import { logger } from './logger';

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

  logger.info(`Started clearing application (/) commands on guild id: ${guildId}.`);

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });

  logger.info(`Successfully cleared application (/) commands on guild id: ${guildId}.`);
} catch (error) {
  logger.error(error);
}
