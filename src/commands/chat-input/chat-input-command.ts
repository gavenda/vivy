import type { AppContext } from '@app/context';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js';

export interface AppChatInputCommand {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute: (context: AppContext, interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (context: AppContext, interaction: AutocompleteInteraction) => Promise<void>;
}
