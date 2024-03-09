import { Awaitable, isValidHttpUrl } from '@app/utils';
import {
  GatewayDispatchEvents,
  GatewayReceivePayload,
  GatewaySendPayload,
  GatewayVoiceServerUpdateDispatch,
  GatewayVoiceStateUpdateDispatch
} from 'discord.js';
import EventEmitter from 'events';
import { createClient } from 'redis';
import { LavalinkEvents } from './link.events';
import { LavalinkNode, LavalinkNodeOptions } from './node';
import { LoadResultType } from './payload';
import { PlayerOptions } from './player';

export enum LavalinkSource {
  YOUTUBE = 'ytsearch',
  YOUTUBE_MUSIC = 'ytmsearch'
}

export interface SearchOptions<UserData> {
  query: string;
  userData: UserData;
  source?: LavalinkSource;
}

export interface Lavalink<UserData> {
  on<E extends keyof LavalinkEvents<UserData>>(event: E, listener: LavalinkEvents<UserData>[E]): this;
  emit<E extends keyof LavalinkEvents<UserData>>(event: E, ...args: Parameters<LavalinkEvents<UserData>[E]>): boolean;
}

export type SendVoiceUpdate = (guildId: string, payload: GatewaySendPayload) => Awaitable<void>;

export interface LavalinkOptions {
  nodes: LavalinkNodeOptions[];
  redis: ReturnType<typeof createClient>;
  sendVoiceUpdate: SendVoiceUpdate;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Lavalink<UserData> extends EventEmitter {
  nodes: LavalinkNode<UserData>[] = [];
  redis: ReturnType<typeof createClient>;
  options: LavalinkOptions;
  sendVoiceUpdate: SendVoiceUpdate;
  userId?: string;

  constructor(options: LavalinkOptions) {
    super();

    this.options = options;
    this.redis = options.redis;
    this.sendVoiceUpdate = options.sendVoiceUpdate;
  }

  connectedNodes() {
    return this.nodes.filter((node) => node.connected);
  }

  getPlayer(guildId: string) {
    const node = this.nodes.find((node) => node.players.has(guildId));
    return node?.players.get(guildId);
  }

  availableNode() {
    const connectedNodes = this.connectedNodes();

    if (connectedNodes.length === 0) {
      throw Error('No nodes connected');
    }

    return connectedNodes[Math.floor(Math.random() * connectedNodes.length)];
  }

  async createPlayer(options: PlayerOptions) {
    const node = this.availableNode();
    return node.createPlayer(options);
  }

  async init(userId: string) {
    this.userId = userId;

    for (const nodeOptions of this.options.nodes) {
      const node = new LavalinkNode<UserData>(this, userId, nodeOptions);
      this.nodes.push(node);
      await node.connect();
    }
  }

  async handleRawData(data: GatewayReceivePayload) {
    switch (data.t) {
      // case GatewayDispatchEvents.ChannelDelete:
      //   await this.handleChannelDelete(data);
      //   break;
      case GatewayDispatchEvents.VoiceServerUpdate:
        await this.handleVoiceServerUpdate(data);
        break;
      case GatewayDispatchEvents.VoiceStateUpdate:
        await this.handleVoiceStateUpdate(data);
        break;
    }
  }

  // TODO: handle channel deletion
  // async handleChannelDelete(data: GatewayChannelDeleteDispatch) {}

  async handleVoiceStateUpdate(data: GatewayVoiceStateUpdateDispatch) {
    if (!data.d.guild_id) return;
    if (data.d.user_id !== this.userId) return;

    const player = this.getPlayer(data.d.guild_id);

    if (!player) return;

    if (data.d.channel_id && data.d.channel_id !== player.voiceChannelId && player.voiceChannelId) {
      player.voiceChannelId = data.d.channel_id;

      this.emit('playerMove', player, player.voiceChannelId, data.d.channel_id);
    }

    if (!data.d.channel_id) {
      player.voice = {};
      player.connected = false;

      this.emit('playerDisconnected', player);
    }

    player.voice.sessionId = data.d.session_id;

    if (!player.voice.token) return;
    if (!player.voice.endpoint) return;

    await player.update({
      voice: {
        token: player.voice.token,
        endpoint: player.voice.endpoint,
        sessionId: data.d.session_id
      }
    });
  }

  async handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatch) {
    const player = this.getPlayer(data.d.guild_id);

    if (!player) return;
    if (!data.d.endpoint) return;

    player.voice.endpoint = data.d.endpoint;
    player.voice.token = data.d.token;

    if (!player.voice.sessionId) return;

    await player.update({
      voice: {
        token: data.d.token,
        endpoint: data.d.endpoint,
        sessionId: player.voice.sessionId
      }
    });
  }

  async search(options: SearchOptions<UserData>) {
    const { query, userData } = options;
    let { source } = options;

    if (!source) {
      source = LavalinkSource.YOUTUBE_MUSIC;
    }

    const identifier = `${source}:${query}`;
    const result = isValidHttpUrl(query)
      ? await this.availableNode().loadTrack(query)
      : await this.availableNode().loadTrack(identifier);

    switch (result.loadType) {
      case LoadResultType.TRACK:
        result.data.userData = userData;
        break;
      case LoadResultType.PLAYLIST:
        result.data.tracks.forEach((track) => (track.userData = userData));
        break;
      case LoadResultType.SEARCH:
        result.data.forEach((track) => (track.userData = userData));
        break;
    }

    return result;
  }
}
