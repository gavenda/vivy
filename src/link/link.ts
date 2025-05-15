import { type Awaitable, isValidHttpUrl } from '@app/utils';
import {
  ChannelType,
  type GatewayChannelDeleteDispatch,
  GatewayDispatchEvents,
  type GatewayReceivePayload,
  type GatewaySendPayload,
  type GatewayVoiceServerUpdateDispatch,
  type GatewayVoiceStateUpdateDispatch
} from 'discord.js';
import EventEmitter from 'events';
import { createClient } from 'redis';
import type { LavalinkEvents } from './link.events';
import { LavalinkNode, type LavalinkNodeOptions } from './node';
import { LoadResultType } from './payload';
import type { PlayerOptions } from './player';

/**
 * Lavalink sources.
 */
export enum LavalinkSource {
  /**
   * Search in {@link https://www.youtube.com/ |  YouTube}.
   */
  YOUTUBE = 'ytsearch',
  /**
   * Search in {@link https://music.youtube.com/ |  YouTube Music}.
   */
  YOUTUBE_MUSIC = 'ytmsearch'
}

export interface SearchOptions<UserData> {
  /**
   * Search query. Can be a link if supported by the enabled sources.
   */
  query: string;
  /**
   * Arbitrary user data you want to pass along.
   */
  userData: UserData;
  /**
   * The source you want to query. Defaults to {@link LavalinkSource.YOUTUBE_MUSIC}.
   */
  source?: LavalinkSource;
}

export interface Lavalink<UserData> {
  on<E extends keyof LavalinkEvents<UserData>>(event: E, listener: LavalinkEvents<UserData>[E]): this;
  emit<E extends keyof LavalinkEvents<UserData>>(event: E, ...args: Parameters<LavalinkEvents<UserData>[E]>): boolean;
}

/**
 * Send voice update function.
 * @param guildId the guild id
 * @param payload the payload from discord.js
 */
export type SendVoiceUpdate = (guildId: string, payload: GatewaySendPayload) => Awaitable<void>;

export interface LavalinkOptions {
  /**
   * The nodes to use.
   */
  nodes: LavalinkNodeOptions[];
  /**
   * The redis client.
   */
  redis: ReturnType<typeof createClient>;
  /**
   * The send voice update function.
   */
  sendVoiceUpdate: SendVoiceUpdate;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Lavalink<UserData> extends EventEmitter {
  /**
   * The nodes that belong in this client.
   */
  nodes: LavalinkNode<UserData>[] = [];
  /**
   * The redis client.
   */
  redis: ReturnType<typeof createClient>;
  /**
   * The options that were used when creating this client.
   */
  options: LavalinkOptions;
  /**
   * The send voice update function.
   */
  sendVoiceUpdate: SendVoiceUpdate;
  /**
   * The user id of the discord bot this client belongs to.
   */
  userId?: string;

  constructor(options: LavalinkOptions) {
    super();

    this.options = options;
    this.redis = options.redis;
    this.sendVoiceUpdate = options.sendVoiceUpdate;
  }

  /**
   * The connected nodes in this client.
   */
  get connectedNodes() {
    return this.nodes.filter((node) => node.connected);
  }

  /**
   * Retrieves a ready and available node.
   */
  get availableNode() {
    if (this.connectedNodes.length === 0) {
      throw Error('No nodes connected');
    }

    return this.connectedNodes[Math.floor(Math.random() * this.connectedNodes.length)];
  }

  /**
   * Returns an instance of {@link Player} within this client.
   * @param guildId the guild of the player
   * @returns the player instance, or `null` if not found.
   */
  getPlayer(guildId: string) {
    const node = this.nodes.find((node) => node.players.has(guildId));
    return node?.players.get(guildId);
  }

  /**
   * Creates a player instance on an available node.
   * @param options player options
   */
  async createPlayer(options: PlayerOptions) {
    return this.availableNode.createPlayer(options);
  }

  /**
   * Initializes this client.
   * @param userId the user id of the bot
   */
  async init(userId: string) {
    this.userId = userId;

    for (const nodeOptions of this.options.nodes) {
      const node = new LavalinkNode<UserData>(this, userId, nodeOptions);
      this.nodes.push(node);
      await node.connect();
    }
  }

  /**
   * Handle raw data coming from the discord gateway.
   * @param data raw data coming from discord.js
   */
  async handleRawData(data: GatewayReceivePayload) {
    switch (data.t) {
      case GatewayDispatchEvents.ChannelDelete:
        await this.handleChannelDelete(data);
        break;
      case GatewayDispatchEvents.VoiceServerUpdate:
        await this.handleVoiceServerUpdate(data);
        break;
      case GatewayDispatchEvents.VoiceStateUpdate:
        await this.handleVoiceStateUpdate(data);
        break;
    }
  }

  /**
   * Search for a track.
   * @param options track search options
   * @returns the search load result
   */
  async search(options: SearchOptions<UserData>) {
    const { query, userData } = options;
    let { source } = options;

    if (!source) {
      source = LavalinkSource.YOUTUBE_MUSIC;
    }

    const identifier = `${source}:${query}`;
    const result = isValidHttpUrl(query)
      ? await this.availableNode.loadTrack(query)
      : await this.availableNode.loadTrack(identifier);

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

  /**
   * Handle channel delete.
   * @param data channel delete data from discord.js
   */
  private async handleChannelDelete(data: GatewayChannelDeleteDispatch) {
    if (data.d.type !== ChannelType.GuildVoice) return;
    if (!data.d.guild_id) return;

    const player = this.getPlayer(data.d.guild_id);

    if (!player) return;

    await player.node.destroyPlayer(data.d.guild_id);
  }

  /**
   * Handle voice state update.
   * @param data voice update dispatch data from discord.js
   */
  private async handleVoiceStateUpdate(data: GatewayVoiceStateUpdateDispatch) {
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

  /**
   * Handle voice server update.
   * @param data voice server update data coming from discord.js
   */
  private async handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatch) {
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
}
