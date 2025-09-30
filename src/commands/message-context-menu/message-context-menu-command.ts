import type { AppContext } from '@app/context';
import type {
  MessageContextMenuCommandInteraction,
  RESTPostAPIContextMenuApplicationCommandsJSONBody
} from 'discord.js';

export interface AppUserContextMenuCommand {
  data: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  execute: (context: AppContext, interaction: MessageContextMenuCommandInteraction) => Promise<void>;
}
