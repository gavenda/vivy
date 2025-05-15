import type { VoiceState } from './payload';
import { RepeatMode } from './player';

export interface PlayerState {
  guildId: string;
  voiceChannelId?: string;
  voice: Partial<VoiceState>;
  repeatMode: RepeatMode;
  playing: boolean;
  volume: number;
  position: number;
  autoLeave: boolean;
  autoLeaveMs: number;
}
