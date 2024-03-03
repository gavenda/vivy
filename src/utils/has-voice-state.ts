import { GuildMember } from 'discord.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const hasVoiceState = (member: any): member is GuildMember => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return member.voice !== undefined;
};
