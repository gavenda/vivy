import type { AppContext } from '@app/context';
import type { Awaitable, ClientEvents } from 'discord.js';

export interface AppEvent<DiscordEvent extends keyof ClientEvents> {
  event: DiscordEvent;
  once: boolean;
  execute: (context: AppContext, ...args: ClientEvents[DiscordEvent]) => Awaitable<void>;
}
