import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface AppCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
