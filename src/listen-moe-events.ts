import type { AppContext } from './context';
import { LISTEN_MOE_STREAMS } from './listen.moe';
import { updatePlayer } from './player';

export const registerListenMoeEvents = (context: AppContext) => {
  const { link, listenMoe } = context;

  listenMoe.on('trackUpdate', async () => {
    for (const node of link.connectedNodes) {
      for (const player of node.players) {
        if (player.queue.current && LISTEN_MOE_STREAMS.includes(player.queue.current.info.identifier)) {
          await updatePlayer(context, player.guildId);
        }
      }
    }
  });
};
