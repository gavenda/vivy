import { getLogger } from '@logtape/logtape';
import { Events, type GatewayReceivePayload } from 'discord.js';
import type { AppContext } from './context';
import { events } from './events';

const logger = getLogger(['vivy', 'discord']);

export const registerDiscordEvents = (context: AppContext) => {
  const { client, link } = context;

  client.on('raw', async (data: GatewayReceivePayload) => {
    await link.handleRawData(data);
  });

  client.on(Events.Error, (error) => {
    logger.error('Internal error', { error });
  });

  for (const { once, event, execute } of events) {
    logger.debug({ message: 'Registering event handler', event });

    // @ts-expect-error too much OR typing here, compiler will get confused
    client[once ? 'once' : 'on'](event, ($event) => execute(context, $event));
  }
};
