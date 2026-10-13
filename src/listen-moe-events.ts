import type { AppContext } from './context';
import { updatePlayer } from './player';

export const registerListenMoeEvents = (context: AppContext) => {
  const { link, listenMoe } = context;

  listenMoe.on('trackUpdate', async (type) => {
    for (const node of link.connectedNodes) {
      for (const player of node.players) {
        if (listenMoe.radioOf(player.guildId) === type) {
          await updatePlayer(context, player.guildId);
        }
      }
    }
  });
};
