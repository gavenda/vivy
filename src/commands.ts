import { clear } from './commands/clear.command';
import { disconnect } from './commands/disconnect.command';
import { effect } from './commands/effect.command';
import { loop } from './commands/loop.command';
import { pause } from './commands/pause.command';
import { play } from './commands/play.command';
import { player } from './commands/player.command';
import { playlist } from './commands/playlist.command';
import { queue } from './commands/queue.command';
import { remove } from './commands/remove.command';
import { resume } from './commands/resume.command';
import { shuffle } from './commands/shuffle.command';
import { skip } from './commands/skip.command';
import { stop } from './commands/stop.command';
import { volume } from './commands/volume.command';

export const commands = [
  player,
  clear,
  disconnect,
  effect,
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
