import { logger } from '@app/logger';
import type { N8NWebhookResponse } from './n8n-webhook-response';

/**
 * Send a prompt to the gpt agent webhook.
 * @param message
 * @param userId
 * @returns
 */
export const agentPrompt = async (promptOpts: { message: string; userId: string; userName: string }) => {
  if (!process.env.N8N_AGENT_WEBHOOK) return;
  if (!process.env.N8N_AGENT_WEBHOOK_SECRET) return;

  const { message, userId, userName } = promptOpts;

  const body = {
    message
  };

  const headers = {
    'Content-Type': `application/json`,
    'Discord-User-Id': userId,
    'Discord-User-Name': userName,
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
