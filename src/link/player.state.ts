import type { Filters, VoiceState } from './payload';
import { RepeatMode } from './player';

export interface PlayerState {
  guildId: string;
  voiceChannelId?: string;
  voiceState: Partial<VoiceState> | undefined;
  filters: Filters;
  repeatMode: RepeatMode;
  playing: boolean;
  volume: number;
  position: number;
  autoLeave: boolean;
  autoLeaveMs: number;
}
