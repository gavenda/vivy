import { Awaitable } from '@app/utils/awaitable';
import { LavalinkNode } from './node';
import { Exception } from './payload';
import { Track } from './payload/track';
import { Player } from './player';

export interface LavalinkEvents<UserData> {
  trackStart: (player: Player<UserData>, track: Track<UserData>) => Awaitable<void>;
  trackEnd: (player: Player<UserData>, track: Track<UserData>) => Awaitable<void>;
  trackStuck: (player: Player<UserData>, track: Track<UserData>, thresholdMs: number) => Awaitable<void>;
  trackError: (
    player: Player<UserData>,
    track: Track<UserData>,
    error: string,
    exception: Exception
  ) => Awaitable<void>;
  queueEnd: (player: Player<UserData>) => Awaitable<void>;
  playerConnected: (player: Player<UserData>) => Awaitable<void>;
  playerCreate: (player: Player<UserData>) => Awaitable<void>;
  playerMove: (player: Player<UserData>, oldVoiceChannelId: string, newVoiceChannelId: string) => Awaitable<void>;
  playerDisconnect: (player: Player<UserData>) => Awaitable<void>;
  playerDestroy: (player: Player<UserData>) => Awaitable<void>;
  playerSocketClosed: (player: Player<UserData>) => Awaitable<void>;
  nodeConnected: (node: LavalinkNode<UserData>) => Awaitable<void>;
  nodeReady: (node: LavalinkNode<UserData>) => Awaitable<void>;
  nodeError: (node: LavalinkNode<UserData>, error: Error) => Awaitable<void>;
}