import { bind } from './commands/bind.command.js';
import { clear } from './commands/clear.command.js';
import { disconnect } from './commands/disconnect.command.js';
import { effect } from './commands/effect.command.js';
import { loop } from './commands/loop.command.js';
import { pause } from './commands/pause.command.js';
import { play } from './commands/play.command.js';
import { playlist } from './commands/playlist.command.js';
import { queue } from './commands/queue.command.js';
import { remove } from './commands/remove.command.js';
import { resume } from './commands/resume.command.js';
import { shuffle } from './commands/shuffle.command.js';
import { skip } from './commands/skip.command.js';
import { stop } from './commands/stop.command.js';
import { unbind } from './commands/unbind.command.js';
import { volume } from './commands/volume.command.js';

export const commands = [
  bind,
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
  unbind,
  volume,
];
