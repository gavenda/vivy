import { GatewayOpcodes } from 'discord.js';
import { LavalinkFilter } from './filter';
import { Lavalink } from './link';
import { LavalinkNode } from './node';
import { Track, UpdatePlayerOptions, VoiceState } from './payload';
import { TrackQueue } from './queue';

export enum RepeatMode {
  TRACK = 'track',
  QUEUE = 'queue',
  OFF = 'off'
}

export interface PlayerOptions {
  guildId: string;
  voiceChannelId: string;
}

/**
 * An interface that can be safely stored as json.
 */
export interface PlayerState {
  guildId: string;
  voiceChannelId: string;
  voice: Partial<VoiceState>;
  repeatMode: RepeatMode;
  playing: boolean;
  volume: number;
  position: number;
}

export class Player<UserData> {
  link: Lavalink<UserData>;
  node: LavalinkNode<UserData>;
  queue: TrackQueue<UserData>;
  guildId: string;
  voiceChannelId: string;
  voice: Partial<VoiceState> = {};
  position: number = 0;
  connected: boolean = false;
  time: number = 0;
  ping: number = 0;
  repeatMode: RepeatMode = RepeatMode.OFF;
  playing: boolean = false;
  volume = 1.0;
  filter = new LavalinkFilter(this);
  saveIntervalId: NodeJS.Timeout;

  constructor(link: Lavalink<UserData>, node: LavalinkNode<UserData>, options: PlayerOptions) {
    this.link = link;
    this.node = node;
    this.guildId = options.guildId;
    this.voiceChannelId = options.voiceChannelId;
    this.queue = new TrackQueue([], { link, guildId: options.guildId });
    // Save state every minute
    this.saveIntervalId = setInterval(async () => {
      await this.queue.save();
      await this.save();
    }, 60000);
  }

  async init() {
    await this.queue.sync();
    // Emit creation
    this.link.emit('playerInit', this);
  }

  get remaining(): number {
    const length = this.queue.current?.info.length ?? 0;
    return Math.max(0, length - this.position);
  }

  get duration(): number {
    return Math.max(0, this.queue.duration);
  }

  async destroy() {
    await this.node.destroyPlayer(this.guildId);
    this.link.emit('playerDestroy', this);
    clearTimeout(this.saveIntervalId);
  }

  async update(options: UpdatePlayerOptions<UserData>) {
    await this.node.updatePlayer(this.guildId, options);
  }

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

    await this.node.rest.updatePlayer(this.guildId, { track });
    this.playing = true;
  }

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

  async stop() {
    await this.node.rest.updatePlayer(this.guildId, { track: { encoded: null } });
    this.playing = false;
  }

  async pause() {
    await this.node.rest.updatePlayer(this.guildId, { paused: true });
    this.playing = false;
  }

  async resume() {
    await this.node.rest.updatePlayer(this.guildId, { paused: false });
    this.playing = true;
  }

  async setVolume(volume: number) {
    this.volume = volume;
    await this.node.rest.updatePlayer(this.guildId, { filters: { volume } });
  }

  async connect() {
    if (this.connected) return;

    await this.link.sendVoiceUpdate(this.guildId, {
      op: 4,
      d: {
        guild_id: this.guildId,
        channel_id: this.voiceChannelId,
        self_mute: false,
        self_deaf: false
      }
    });
  }

  async disconnect() {
    if (!this.connected) return;
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

  get stateKey(): string {
    return `player:state:${this.node.options.host}:${this.guildId}`;
  }

  get state(): PlayerState {
    return {
      playing: this.playing,
      voiceChannelId: this.voiceChannelId,
      repeatMode: this.repeatMode,
      volume: this.volume,
      guildId: this.guildId,
      voice: this.voice,
      position: this.position
    };
  }

  async save() {
    const redis = this.link.redis;
    const stateStr = JSON.stringify(this.state);
    await redis.set(this.stateKey, stateStr);
  }

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
}
