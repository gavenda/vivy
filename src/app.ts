import { ActivityType, Client, Events, GatewayIntentBits } from 'discord.js';

import dotenv from 'dotenv';
import { commands } from './commands.js';
import { redis } from './redis.js';
import { logger } from './logger.js';
import { events } from './events.js';
import { exit } from 'node:process';

// Load environment variables
dotenv.config();

// Create discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in`, { user: readyClient.user.tag });

  client.user.setPresence({
    status: 'online',
    activities: [{ name: `Flourite Eye's Song`, type: ActivityType.Listening }],
  });
});

// Chat input command interaction event
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((command) => command.data.name === interaction.commandName);

  const context = {
    command: interaction.commandName,
    user: interaction.user.tag,
    userId: interaction.user.id,
  };

  logger.debug(`Received interaction command`, context);

  if (!command) {
    logger.warn(`No matching command was found`, context);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    // Log error
    logger.error(error, context);

    // Make sure we reply to the user or they get hanged.
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  }
});

// Register events
for (const { event, execute } of events) {
  client.on(event, execute);
}

try {
  // Connect to redis
  await redis.connect();

  // Now ready to login to gateway
  await client.login(process.env.TOKEN);
} catch (error) {
  logger.error(error);
  exit(1);
}
