import { ChatInputCommandInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

interface SlashCommand {
  name: string;
  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
}

export interface AppCommand {
  data: SlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
