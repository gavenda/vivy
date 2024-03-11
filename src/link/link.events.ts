import { Awaitable } from '@app/utils/awaitable';
import { LavalinkNode } from './node';
import { Exception, Track, TrackEndReason } from './payload';
import { Player } from './player';

export interface LavalinkEvents<UserData> {
  /**
   * Emitted when a track is started.
   * @param player the player instance
   * @param track
   */
  trackStart: (player: Player<UserData>, track: Track<UserData>) => Awaitable<void>;
  /**
   * Emitted when a track has ended.
   * @param player the player instance
   * @param track
   * @param reason
   */
  trackEnd: (player: Player<UserData>, track: Track<UserData>, reason: TrackEndReason) => Awaitable<void>;
  /**
   * Emitted when a track got stuck due to a bad seek.
   * @param player the player instance
   * @param track
   * @param thresholdMs
   */
  trackStuck: (player: Player<UserData>, track: Track<UserData>, thresholdMs: number) => Awaitable<void>;
  /**
   * Emitted when a track throws an error.
   * @param player the player instance
   * @param track
   * @param exception
   */
  trackError: (player: Player<UserData>, track: Track<UserData>, exception: Exception) => Awaitable<void>;
  queueEnd: (player: Player<UserData>) => Awaitable<void>;
  /**
   * Emitted when a player has connected to discord.
   * @param player the player instance
   * @returns
   */
  playerConnected: (player: Player<UserData>) => Awaitable<void>;
  /**
   * Emitted when a player has finished initializing.
   * @param player the player instance
   */
  playerInit: (player: Player<UserData>) => Awaitable<void>;
  /**
   * Emitted when a player has changed voice channels.
   * @param player the player instance
   * @param oldVoiceChannelId old voice channel id
   * @param newVoiceChannelId new voice channel id
   */
  playerMove: (player: Player<UserData>, oldVoiceChannelId: string, newVoiceChannelId: string) => Awaitable<void>;
  /**
   * Emitted when a player has disconnected.
   * @param player the player instance
   * @returns
   */
  playerDisconnected: (player: Player<UserData>) => Awaitable<void>;
  /**
   * Emitted when a player has been destroyed.
   * @param player the player instance
   */
  playerDestroy: (player: Player<UserData>) => Awaitable<void>;
  /**
   * Emitted when a player socket has been closed either by discord or other reasons.
   * @param player the player instance
   * @param code the socket close code
   * @param byRemote true if disconnected by Discord
   * @param reason the close reason
   */
  playerSocketClosed: (player: Player<UserData>, code: number, byRemote: boolean, reason: string) => Awaitable<void>;
  /**
   * Emitted when a node has disconnected.
   * @param node the node instance
   */
  nodeDisconnected: (node: LavalinkNode<UserData>) => Awaitable<void>;
  /**
   * Emitted when a node is connected.
   * @param node the node instance
   */
  nodeConnected: (node: LavalinkNode<UserData>) => Awaitable<void>;
  /**
   * Emitted when a node is ready for requests.
   * @param node the node instance
   */
  nodeReady: (node: LavalinkNode<UserData>) => Awaitable<void>;
  /**
   * Emitted when a node has resumed from a disconnected session.
   * @param node the node instance
   */
  nodeResumed: (node: LavalinkNode<UserData>) => Awaitable<void>;
  /**
   * Emitted when a node has encountered an error.
   * @param node the node instance
   * @param error the error that occured
   */
  nodeError: (node: LavalinkNode<UserData>, error: Error) => Awaitable<void>;
}
