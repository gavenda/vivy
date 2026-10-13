import { getLogger } from '@logtape/logtape';
import { REST, Routes } from 'discord.js';
import { chatInputCommands } from './commands/chat-input';
import { messageContextMenuCommands } from './commands/message-context-menu';
import { required } from './config';

/**
 * Registers or clears the application (/) commands, globally or on a single guild.
 *
 * Usage: bun ./src/manage-commands.ts <register|clear> [--guild]
 */
const [action, ...flags] = process.argv.slice(2);

if (action !== 'register' && action !== 'clear') {
  throw new Error('Usage: manage-commands <register|clear> [--guild]');
}

const logger = getLogger(['vivy', 'commands']);
const rest = new REST().setToken(required('TOKEN'));
const clientId = required('CLIENT_ID');
const guildId = flags.includes('--guild') ? required('GUILD_ID') : undefined;
const scope = guildId ? `on guild id: ${guildId}` : 'globally';

const body =
  action === 'register'
    ? [
        ...chatInputCommands.map((command) => command.data),
        ...messageContextMenuCommands.map((command) => command.data)
      ]
    : [];

try {
  logger.info({
    message: `Started ${action === 'register' ? 'refreshing' : 'clearing'} ${body.length} (/) commands ${scope}.`
  });

  const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);

  await rest.put(route, { body });

  logger.info({ message: `Successfully ${action === 'register' ? 'reloaded' : 'cleared'} (/) commands ${scope}.` });
} catch (error) {
  logger.error({ error });
}
