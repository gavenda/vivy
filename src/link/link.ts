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
import { Player, PlayerOptions } from './player';

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
  players = new Map<string, Player<UserData>>();
  nodes: LavalinkNode<UserData>[] = [];
  options: LavalinkOptions;
  sendVoiceUpdate: SendVoiceUpdate;
  userId?: string;

  constructor(options: LavalinkOptions) {
    super();

    this.options = options;
    this.sendVoiceUpdate = options.sendVoiceUpdate;
  }

  connectedNodes() {
    return this.nodes.filter((node) => node.connected);
  }

  availableNode() {
    const connectedNodes = this.connectedNodes();

    if (connectedNodes.length === 0) {
      throw Error('No nodes connected');
    }

    return connectedNodes[Math.floor(Math.random() * connectedNodes.length)];
  }

  createPlayer(options: PlayerOptions): Player<UserData> {
    const node = this.availableNode();
    // Check existing players
    if (this.players.has(options.guildId)) {
      const player = this.players.get(options.guildId);

      if (!player) {
        throw new Error('Possible race condition occured');
      }

      if (player.voiceChannelId !== options.voiceChannelId) {
        player.voiceChannelId = options.voiceChannelId;
      }

      return player;
    } else {
      const player = new Player(this, node, options);
      this.players.set(options.guildId, player);
      return player;
    }
  }

  init(userId: string) {
    this.userId = userId;

    for (const nodeOptions of this.options.nodes) {
      const node = new LavalinkNode<UserData>(this, nodeOptions);
      this.nodes.push(node);
      node.connect(userId);
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

    const player = this.players.get(data.d.guild_id);

    if (!player) return;

    player.voice.sessionId = data.d.session_id;

    if (data.d.channel_id) {
      this.emit('playerMove', player, player.voiceChannelId, data.d.channel_id);
      player.voiceChannelId = data.d.channel_id;
    }

    if (!player.voice.token) return;
    if (!player.voice.endpoint) return;

    await player.update({
      voice: {
        token: player.voice.token,
        endpoint: player.voice.endpoint,
        sessionId: player.voice.sessionId
      }
    });
  }

  async handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatch) {
    const player = this.players.get(data.d.guild_id);

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
