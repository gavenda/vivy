import { Awaitable, ClientEvents } from 'discord.js';

export interface AppEvent<DiscordEvent extends keyof ClientEvents> {
  event: DiscordEvent;
  once: boolean;
  execute: (...args: ClientEvents[DiscordEvent]) => Awaitable<void>;
}
