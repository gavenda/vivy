import { logger } from '@app/logger';
import type { N8NWebhookResponse } from './n8n-webhook-response';
import type { Message, OmitPartialGroupDMChannel } from 'discord.js';
import type { AppContext } from '@app/context';

/**
 * Send a prompt to the gpt agent webhook.
 */
export const agentPrompt = async (promptOpts: {
  context: AppContext;
  message: OmitPartialGroupDMChannel<Message<boolean>>;
  prompt: string;
}) => {
  if (!process.env.N8N_AGENT_WEBHOOK) return;
  if (!process.env.N8N_AGENT_WEBHOOK_SECRET) return;

  const { message, context } = promptOpts;
  const { link } = context;

  if (!message.guildId) return;

  const body = {
    message
  };

  const player = link.findPlayerByGuildId(message.guildId);

  const headers = {
    'Content-Type': `application/json`,
    'Discord-User-Id': message.author.id,
    'Discord-User-Name': message.author.username,
    'Music-Requester': player?.queue.current?.userData.userName || '',
    'Music-Name': player?.queue.current?.info.title || '',
    'Music-Author': player?.queue.current?.info.author || '',
    'Music-URL': player?.queue.current?.info.uri || '',
    'Music-Length': '' + (player?.queue.current?.info.length || ''),
    'Authorization': `Bearer ${process.env.N8N_AGENT_WEBHOOK_SECRET}`
  };

  logger.debug(`Sending webhook to n8n`, { headers, body });

  const response = await fetch(process.env.N8N_AGENT_WEBHOOK, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const json = await response.json();
  const result = json as {
    output: N8NWebhookResponse;
  };
  const { output } = result;

  return output;
};
