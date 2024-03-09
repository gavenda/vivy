import { Events } from 'discord.js';
import { AppEvent } from './event';

export const guildUnavailable: AppEvent<Events.GuildUnavailable> = {
  event: Events.GuildUnavailable,
  once: false,
  execute: async (context, guild) => {
    if (context.link.connectedNodes.length === 0) return;

    const player = context.link.getPlayer(guild.id);

    if (!player) return;

    await player.destroy();
  }
};
