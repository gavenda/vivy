import { Track } from './track';

export interface VoiceState {
  token: string;
  endpoint: string;
  sessionId: string;
}

export interface Equalizer {
  band: number;
  gain: number;
}

export interface Karaoke {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface Timescale {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface Tremolo {
  frequency?: number;
  depth?: number;
}

export interface Vibrato {
  frequency?: number;
  depth?: number;
}

export interface Rotation {
  rotationHz?: number;
}

export interface Distortion {
  sinOffset?: number;
  sinScale?: number;
  cosOffset?: number;
  cosScale?: number;
  tanOffset?: number;
  tanScale?: number;
  offset?: number;
  scale?: number;
}

export interface ChannelMix {
  leftToLeft?: number;
  leftToRight?: number;
  rightToLeft?: number;
  rightToRight?: number;
}

export interface Lowpass {
  smoothing?: number;
}

export interface Filters {
  volume?: number;
  equalizer?: Equalizer[];
  karaoke?: Karaoke;
  timescale?: Timescale;
  tremolo?: Tremolo;
  vibrato?: Vibrato;
  rotation?: Rotation;
  distortion?: Distortion;
  channelMix?: ChannelMix;
  lowPass?: Lowpass;
}

export interface UpdatePlayerOptions<UserData> {
  track?: Partial<Track<UserData>>;
  position?: number;
  endTime?: number | null;
  volume?: number;
  paused?: boolean;
  filters?: Filters;
  voice?: VoiceState;
}
