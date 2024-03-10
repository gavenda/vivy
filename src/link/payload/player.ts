export interface VoiceState {
  /**
   * The Discord voice token to authenticate with.
   */
  token: string;
  /**
   * The Discord voice endpoint to connect to.
   */
  endpoint: string;
  /**
   * The Discord voice session id to authenticate with.
   */
  sessionId: string;
}

/**
 * There are 15 bands (0-14) that can be changed. "gain" is the multiplier for the given band.
 *
 * The default value is 0. Valid values range from -0.25 to 1.0, where -0.25 means the given band is completely muted,
 * and 0.25 means it is doubled.
 *
 * Modifying the gain could also change the volume of the output.
 */
export interface Equalizer {
  /**
   * The band (0 to 14)
   */
  band: number;
  /**
   * The gain (-0.25 to 1.0)
   */
  gain: number;
}

/**
 * Uses equalization to eliminate part of a band, usually targeting vocals.
 */
export interface Karaoke {
  /**
   * The level (0 to 1.0 where 0.0 is no effect and 1.0 is full effect).
   */
  level?: number;
  /**
   * The mono level (0 to 1.0 where 0.0 is no effect and 1.0 is full effect).
   */
  monoLevel?: number;
  /**
   * The filter band (in Hz).
   */
  filterBand?: number;
  /**
   * The filter width.s
   */
  filterWidth?: number;
}

/**
 * Changes the speed, pitch, and rate. All default to 1.0.
 */
export interface Timescale {
  /**
   * The playback speed 0.0 ≤ x.
   */
  speed?: number;
  /**
   * The pitch 0.0 ≤ x.
   */
  pitch?: number;
  /**
   * The rate 0.0 ≤ x.
   */
  rate?: number;
}

/**
 * Uses amplification to create a shuddering effect, where the volume quickly oscillates.
 */
export interface Tremolo {
  /**
   * The frequency 0.0 < x.
   */
  frequency?: number;
  /**
   * The tremolo depth 0.0 < x ≤ 1.0.
   */
  depth?: number;
}

/**
 * Similar to tremolo. While tremolo oscillates the volume, vibrato oscillates the pitch.
 */
export interface Vibrato {
  /**
   * The frequency 0.0 < x ≤ 14.0.
   */
  frequency?: number;
  /**
   * The vibrato depth 0.0 < x ≤ 1.0.
   */
  depth?: number;
}

/**
 * Rotates the sound around the stereo channels/user headphones (aka Audio Panning).
 */
export interface Rotation {
  /**
   * The frequency of the audio rotating around the listener in Hz.
   */
  rotationHz?: number;
}

/**
 * Distortion effect. It can generate some pretty unique audio effects.
 */
export interface Distortion {
  /**
   * The sin offset.
   */
  sinOffset?: number;
  /**
   * The sin scale.
   */
  sinScale?: number;
  /**
   * The cos offset.
   */
  cosOffset?: number;
  /**
   * The cos scale.
   */
  cosScale?: number;
  /**
   * The tan offset.
   */
  tanOffset?: number;
  /**
   * The tan scale.
   */
  tanScale?: number;
  /**
   * The offset.
   */
  offset?: number;
  /**
   * The scale.
   */
  scale?: number;
}

/**
 * Mixes both channels (left and right), with a configurable factor on how much each channel affects the other.
 *
 * With the defaults, both channels are kept independent of each other.
 *
 * Setting all factors to 0.5 means both channels get the same audio.
 */
export interface ChannelMix {
  /**
   * The left to left channel mix factor (0.0 ≤ x ≤ 1.0).
   */
  leftToLeft?: number;
  /**
   * The left to right channel mix factor (0.0 ≤ x ≤ 1.0).
   */
  leftToRight?: number;
  /**
   * The right to left channel mix factor (0.0 ≤ x ≤ 1.0).
   */
  rightToLeft?: number;
  /**
   * The right to right channel mix factor (0.0 ≤ x ≤ 1.0).
   */
  rightToRight?: number;
}

/**
 * Higher frequencies get suppressed, while lower frequencies pass through this filter,
 * thus the name low pass.
 *
 * Any smoothing values equal to or less than 1.0 will disable the filter.
 */
export interface Lowpass {
  /**
   * The smoothing factor (1.0 < x).
   */
  smoothing?: number;
}

export interface Filters {
  /**
   * Adjusts the player volume from 0.0 to 5.0, where 1.0 is 100%. Values >1.0 may cause clipping.
   */
  volume?: number;
  /**
   * Adjusts 15 different bands.
   */
  equalizer?: Equalizer[];
  /**
   * Eliminates part of a band, usually targeting vocals.
   */
  karaoke?: Karaoke;
  /**
   * Changes the speed, pitch, and rate.
   */
  timescale?: Timescale;
  /**
   * Creates a shuddering effect, where the volume quickly oscillates.
   */
  tremolo?: Tremolo;
  /**
   * Creates a shuddering effect, where the pitch quickly oscillates.
   */
  vibrato?: Vibrato;
  /**
   * Rotates the audio around the stereo channels/user headphones (aka Audio Panning).
   */
  rotation?: Rotation;
  /**
   * Distorts the audio.
   */
  distortion?: Distortion;
  /**
   * Mixes both channels (left and right).
   */
  channelMix?: ChannelMix;
  /**
   * Filters higher frequencies.
   */
  lowPass?: Lowpass;
  /**
   * Filter plugin configurations.
   */
  pluginFilters?: Record<string, unknown>;
}

export interface UpdatePlayerTrack<UserData> {
  /**
   * The base64 encoded track to play. `null` stops the current track.
   */
  encoded?: string | null;
  /**
   * The identifier of the track to play.
   */
  identifier?: string;
  /**
   * Additional track data.
   * @see {@link https://lavalink.dev/api/rest.html#update-player}
   */
  userData?: UserData;
}

export interface UpdatePlayerOptions<UserData> {
  /**
   * Specification for a new track to load, as well as user data to set.
   */
  track?: UpdatePlayerTrack<UserData>;
  /**
   * The track position in milliseconds.
   */
  position?: number;
  /**
   * The track end time in milliseconds (must be > 0). `null` resets this if it was set previously.
   */
  endTime?: number | null;
  /**
   * The player volume, in percentage, from 0 to 1000.
   */
  volume?: number;
  /**
   * Whether the player is paused.
   */
  paused?: boolean;
  /**
   * The new filters to apply. This will override all previously applied filters.
   */
  filters?: Filters;
  /**
   * Information required for connecting to Discord.
   */
  voice?: VoiceState;
}
