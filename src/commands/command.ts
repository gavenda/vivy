import { AppContext } from '@/app.context.js';
import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js';

export interface AppCommand {
  data: SlashCommandBuilder;
  execute: (context: AppContext, interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (context: AppContext, interaction: AutocompleteInteraction) => Promise<void>;
}
