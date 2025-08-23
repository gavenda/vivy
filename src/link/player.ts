import { logger } from '@app/logger';
import { GatewayOpcodes } from 'discord.js';
import { LavalinkFilter } from './filter';
import { Lavalink } from './link';
import { LavalinkNode } from './node';
import type { Filters, Track, UpdatePlayerOptions, VoiceState } from './payload';
import type { PlayerState } from './player.state';
import { TrackQueue } from './queue';

export const DEFAULT_AUTO_LEAVE_MS = 1000 * 60 * 5;

export enum RepeatMode {
  /**
   * Repeat the playing track.
   */
  TRACK = 'track',
  /**
   * Repeat the playing queue.
   */
  QUEUE = 'queue',
  /**
   * Turns off repeat.
   */
  OFF = 'off'
}

export interface PlayerOptions {
  /**
   * Guild identifier.
   */
  guildId: string;
  /**
   * Enable auto leave.
   */
  autoLeave: boolean;
  /**
   * Auto leave time in milliseconds.
   */
  autoLeaveMs?: number;
}

export class Player<UserData> {
  /**
   * The lavalink client this player belongs to.
   */
  link: Lavalink<UserData>;
  /**
   * The node this player belongs to.
   */
  node: LavalinkNode<UserData>;
  /**
   * The track queue of this player.
   */
  queue: TrackQueue<UserData>;
  /**
   * The guild id this player belongs to.
   */
  guildId: string;
  /**
   * The voice channel id this player is connected to.
   */
  voiceChannelId?: string;
  /**
   * The position this player is playing music.
   */
  position: number = 0;
  /**
   * The server time of this player.
   */
  time: number = 0;
  /**
   * The latency in milliseconds of this player to the discord voice server.
   */
  ping: number = 0;
  /**
   * The current repeat mode of this player.
   */
  repeatMode: RepeatMode = RepeatMode.OFF;
  /**
   * Returns `true` if player is playing music.
   */
  playing: boolean = false;
  /**
   * The filters applied in this player.
   */
  filter = new LavalinkFilter(this);
  /**
   * The auto leave state of this player.
   */
  autoLeave: boolean;
  /**
   * The amount in milliseconds the player will auto leave after the queue ends.
   */
  autoLeaveMs: number;

  voiceState: Partial<VoiceState> = {};

  constructor(link: Lavalink<UserData>, node: LavalinkNode<UserData>, options: PlayerOptions) {
    this.link = link;
    this.node = node;
    this.guildId = options.guildId;
    this.autoLeave = options.autoLeave;
    this.autoLeaveMs = options.autoLeaveMs ?? DEFAULT_AUTO_LEAVE_MS;
    this.queue = new TrackQueue([], { link, guildId: options.guildId });
  }

  /**
   * Returns `true` if this player has connected to a voice channel.
   */
  get voiceConnected() {
    return this.voiceChannelId !== undefined;
  }

  clearVoiceSession() {
    logger.info('Discord voice session cleared');
    this.voiceState = {};
  }

  private get stateKey(): string {
    return `player:state:${this.node.options.host}:${this.guildId}`;
  }

  private get state(): PlayerState {
    return {
      playing: this.playing,
      voiceChannelId: this.voiceChannelId,
      filters: this.filter.raw,
      repeatMode: this.repeatMode,
      volume: this.volume,
      guildId: this.guildId,
      voiceState: this.voiceState,
      position: this.position,
      autoLeave: this.autoLeave,
      autoLeaveMs: this.autoLeaveMs
    };
  }

  /**
   * The current volume of this player.
   */
  get volume(): number {
    return this.filter.volume;
  }

  /**
   * The remaining time of the this player.
   */
  get remaining(): number {
    const length = this.queue.current?.info.length ?? 0;
    return Math.max(0, length - this.position);
  }

  /**
   * The total track duration of this player.
   */
  get duration(): number {
    return Math.max(0, this.queue.duration);
  }

  /**
   * Initializes this player.
   */
  async init() {
    await this.queue.syncState();
    // Emit creation
    this.link.emit('playerInit', this);
  }

  /**
   * Destroy this player.
   */
  async destroy() {
    await this.node.destroyPlayer(this.guildId);
    this.link.emit('playerDestroy', this);
  }

  /**
   * Updates this player.
   * @param options player update options
   */
  async update(options: UpdatePlayerOptions<UserData>) {
    await this.node.updatePlayer(this.guildId, options);
  }

  /**
   * Play a given track.
   * @param track the track to play
   */
  async play(track: Track<UserData> | null = null) {
    // Check if given null, otherwise take from queue
    if (!track) {
      track = this.queue.dequeue();
    }
    // Take from queue check, still null, stop playing
    if (!track) {
      await this.stop();
      return;
    }

    this.playing = true;
    await this.node.updatePlayer(this.guildId, { track });
  }

  /**
   * Skips the playing track.
   */
  async skip() {
    if (this.repeatMode === RepeatMode.TRACK && this.queue.current) {
      await this.play(this.queue.current);
    } else if (this.repeatMode === RepeatMode.QUEUE && this.queue.current) {
      this.queue.enqueue(this.queue.current);
      await this.play(this.queue.dequeue());
    } else if (this.queue.next) {
      await this.play(this.queue.dequeue());
    } else {
      await this.stop();
    }
  }

  /**
   * Stops the playing track.
   */
  async stop() {
    this.queue.current = null;
    this.playing = false;

    await this.node.updatePlayer(this.guildId, { track: { encoded: null } });
  }

  /**
   * Pauses this player.
   */
  async pause() {
    this.playing = false;

    await this.node.updatePlayer(this.guildId, { paused: true });
  }

  /**
   * Resumes playing if paused.
   */
  async resume() {
    this.playing = true;

    await this.node.updatePlayer(this.guildId, { paused: false });
  }

  /**
   * Applies the amount of volume given to this player
   * @param volume the volume amount in floating numbers i.e (0 - 1.0)
   */
  async applyVolume(volume: number) {
    await this.filter.applyVolume(volume);
  }

  /**
   * Applies the amount of volume given to this player
   * @param volume the volume amount in floating numbers i.e (0 - 1.0)
   */
  async applyFilters(filters: Filters) {
    await this.filter.applyFilters(filters);
  }

  /**
   * Connect to the voice channel.
   * @param voiceChannelId voice channel id
   */
  async connect(voiceChannelId: string) {
    if (this.voiceConnected && this.voiceState.sessionId) return;

    await this.link.sendVoiceUpdate(this.guildId, {
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: voiceChannelId,
        self_mute: false,
        self_deaf: false
      }
    });

    this.voiceChannelId = voiceChannelId;
  }

  /**
   * Disconnect from the voice channel.
   */
  async disconnect() {
    if (!this.voiceConnected) return;

    this.playing = false;

    await this.link.sendVoiceUpdate(this.guildId, {
      op: GatewayOpcodes.VoiceStateUpdate,
      d: {
        guild_id: this.guildId,
        channel_id: null,
        self_mute: false,
        self_deaf: false
      }
    });
  }

  /**
   * Save this player state.
   */
  async saveState() {
    const stateStr = JSON.stringify(this.state);
    await this.link.redis.set(this.stateKey, stateStr);
  }

  /**
   * Delete the player state.
   */
  async deleteState() {
    await this.link.redis.del(this.stateKey);
  }

  /**
   * Sync the voice state.
   * @param voice the voice state
   */
  async syncVoiceState(voice: Partial<VoiceState>) {
    if (!voice.endpoint) return;
    if (!voice.sessionId) return;
    if (!voice.token) return;

    await this.update({
      voice: {
        endpoint: voice.endpoint,
        sessionId: voice.sessionId,
        token: voice.token
      }
    });
  }

  /**
   * Attempt an auto leave.
   */
  attemptAutoLeave() {
    // Auto leave
    if (this.autoLeave) {
      setTimeout(async () => {
        if (!this.playing && this.queue.isEmpty) {
          await this.disconnect();
        }
      }, this.autoLeaveMs);
    }
  }
}
