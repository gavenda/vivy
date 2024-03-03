import { AppContext } from '@/app.context';
import { Awaitable, ClientEvents } from 'discord.js';

export interface AppEvent<DiscordEvent extends keyof ClientEvents> {
  event: DiscordEvent;
  once: boolean;
  execute: (context: AppContext, ...args: ClientEvents[DiscordEvent]) => Awaitable<void>;
}
