import { type Awaitable, isValidHttpUrl } from 'vivy/utils';
import {
  type APIVoiceState,
  ChannelType,
  type GatewayChannelDeleteDispatch,
  GatewayDispatchEvents,
  type GatewayReceivePayload,
  type GatewaySendPayload,
  type GatewayVoiceServerUpdateDispatchData
} from 'discord.js';
import EventEmitter from 'events';
import type { LavalinkEvents } from './link.events';
import { LavalinkNode, type LavalinkNodeOptions } from './node';
import { LoadResultType } from './payload';
import type { PlayerOptions } from './player';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'link']);
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

    const connectedNode = this.connectedNodes[Math.floor(Math.random() * this.connectedNodes.length)];

    if (!connectedNode) {
      throw Error('Cannot fetch connected node');
    }

    return connectedNode;
  }

  /**
   * Returns an instance of {@link Player} within this client.
   * @param guildId the guild of the player
   * @returns the player instance, or `undefined` if not found.
   */
  findPlayerByGuildId(guildId: string) {
    const node = this.nodes.find((node) => node.hasGuildId(guildId));
    return node?.findByGuildId(guildId);
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
   * @param payload raw data coming from discord.js
   */
  async handleRawData(payload: GatewayReceivePayload) {
    switch (payload.t) {
      case GatewayDispatchEvents.ChannelDelete:
        await this.handleChannelDelete(payload);
        break;
      case GatewayDispatchEvents.VoiceServerUpdate:
        await this.handleVoiceServerUpdate(payload.d);
        break;
      case GatewayDispatchEvents.VoiceStateUpdate:
        await this.handleVoiceStateUpdate(payload.d);
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
   * @param payload channel delete payload from discord.js
   */
  private async handleChannelDelete(payload: GatewayChannelDeleteDispatch) {
    const data = payload.d;
    if (data.type !== ChannelType.GuildVoice) return;
    if (!data.guild_id) return;

    const player = this.findPlayerByGuildId(data.guild_id);

    if (!player) return;

    await player.node.destroyPlayer(data.guild_id);
  }

  /**
   * Handle voice state update.
   * @param data voice update dispatch data from discord.js
   */
  private async handleVoiceStateUpdate(data: Partial<APIVoiceState>) {
    logger.debug({ message: `Receiving voice state update`, payload: data });

    if (!data.member) return;
    if (!data.channel_id) return;
    if (!data.guild_id) return;
    if (data.user_id !== this.userId) return;

    const player = this.findPlayerByGuildId(data.guild_id);

    if (!player) return;

    if (data.channel_id && data.channel_id !== player.voiceChannelId && player.voiceChannelId) {
      player.voiceChannelId = data.channel_id;

      this.emit('playerMove', player, player.voiceChannelId, data.channel_id);
    }

    if (!data.channel_id || !data.session_id) {
      player.voiceState = {};
      player.voiceChannelId = undefined;

      this.emit('playerDisconnected', player);
    }

    player.voiceState.sessionId = data.session_id;

    logger.debug('Discord voice session id set', { sessionId: data.session_id });

    if (!player.voiceState.token) return;
    if (!player.voiceState.endpoint) return;

    await player.update({
      voice: {
        token: player.voiceState.token,
        endpoint: player.voiceState.endpoint,
        sessionId: data.session_id
      }
    });
  }

  /**
   * Handle voice server update.
   * @param data voice server update data coming from discord.js
   */
  private async handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatchData) {
    const player = this.findPlayerByGuildId(data.guild_id);

    logger.debug({ message: `Receiving voice server update`, data });

    if (!player) return;

    player.voiceState.endpoint = data.endpoint;
    player.voiceState.token = data.token;

    logger.debug('Discord voice endpoint and token set', { endpoint: data.endpoint, token: data.token });

    if (!player.voiceState.sessionId) return;

    await player.update({
      voice: {
        token: data.token,
        endpoint: data.endpoint,
        sessionId: player.voiceState.sessionId
      }
    });
  }
}
