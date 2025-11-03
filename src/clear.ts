import { REST, Routes } from 'discord.js';
import { getLogger } from '@logtape/logtape';

if (!process.env.TOKEN) {
  throw new Error('TOKEN is required.');
}
if (!process.env.CLIENT_ID) {
  throw new Error('CLIENT_ID is required.');
}

const logger = getLogger(['vivy', 'clear']);
const rest = new REST().setToken(process.env.TOKEN);

try {
  const clientId = process.env.CLIENT_ID;

  logger.info({ message: `Started clearing application (/) commands.` });

  await rest.put(Routes.applicationCommands(clientId), { body: [] });

  logger.info({ message: `Successfully cleared application (/) commands.` });
} catch (error) {
  logger.error({ error });
}
