import { GuildMember } from 'discord.js';

export const hasVoiceState = (member: any): member is GuildMember => {
  return member.voice !== undefined;
};
