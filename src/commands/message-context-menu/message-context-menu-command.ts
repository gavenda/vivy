import type { AppContext } from 'vivy/context';
import type {
  MessageContextMenuCommandInteraction,
  RESTPostAPIContextMenuApplicationCommandsJSONBody
} from 'discord.js';

export interface AppUserContextMenuCommand {
  data: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  execute: (context: AppContext, interaction: MessageContextMenuCommandInteraction) => Promise<void>;
}
