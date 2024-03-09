import { Events } from 'discord.js';
import { AppEvent } from './event';

export const guildAvailable: AppEvent<Events.GuildAvailable> = {
  event: Events.GuildAvailable,
  once: false,
  execute: async (context, guild) => {
    if (context.link.connectedNodes.length === 0) return;

    await context.link.createPlayer({
      guildId: guild.id,
      autoLeave: true
    });
  }
};
