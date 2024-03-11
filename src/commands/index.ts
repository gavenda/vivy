import { clear } from './clear.command';
import { disconnect } from './disconnect.command';
import { effect } from './effect.command';
import { listenMoe } from './listen.moe.command';
import { loop } from './loop.command';
import { pause } from './pause.command';
import { play } from './play.command';
import { player } from './player.command';
import { playlist } from './playlist.command';
import { queue } from './queue.command';
import { remove } from './remove.command';
import { resume } from './resume.command';
import { shuffle } from './shuffle.command';
import { skip } from './skip.command';
import { stop } from './stop.command';
import { volume } from './volume.command';

export const commands = [
  player,
  clear,
  disconnect,
  effect,
  listenMoe,
  loop,
  pause,
  play,
  playlist,
  queue,
  remove,
  resume,
  shuffle,
  skip,
  stop,
  volume
];

export {
  clear,
  disconnect,
  effect,
  listenMoe,
  loop,
  pause,
  play,
  player,
  playlist,
  queue,
  remove,
  resume,
  shuffle,
  skip,
  stop,
  volume
};
