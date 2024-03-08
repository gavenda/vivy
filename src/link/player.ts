import { GatewayOpcodes } from 'discord.js';
import { Lavalink } from './link';
import { LavalinkNode } from './node';
import { Track, UpdatePlayerOptions, VoiceState } from './payload';
import { TrackQueue } from './queue';
import { LavalinkFilter } from './filter';

export enum RepeatMode {
  TRACK = 'track',
  QUEUE = 'queue',
  OFF = 'off'
}

export interface PlayerOptions {
  guildId: string;
  voiceChannelId: string;
}

export class Player<UserData> {
  link: Lavalink<UserData>;
  node: LavalinkNode<UserData>;
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
  queue = new TrackQueue<UserData>();
  filter = new LavalinkFilter(this);

  constructor(link: Lavalink<UserData>, node: LavalinkNode<UserData>, options: PlayerOptions) {
    this.link = link;
    this.node = node;
    this.guildId = options.guildId;
    this.voiceChannelId = options.voiceChannelId;
    // Emit creation
    this.link.emit('playerCreate', this);
  }

  async destroy() {
    await this.node.destroyPlayer(this.guildId);
    this.link.players.delete(this.guildId);
    this.link.emit('playerDestroy', this);
  }

  async update(options: UpdatePlayerOptions<UserData>) {
    await this.node.updatePlayer(this.guildId, options);
  }

  async play(track: Track<UserData> | null = null) {
    if (!track) {
      track = this.queue.dequeue();
    }
    if (track) {
      this.queue.current = track;
      await this.node.rest.updatePlayer(this.guildId, { track });
      this.playing = true;
    }
  }

  async skip() {
    const track = this.queue.dequeue();

    if (!track) {
      await this.stop();
    } else {
      await this.node.rest.updatePlayer(this.guildId, { track }, true);
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
}
