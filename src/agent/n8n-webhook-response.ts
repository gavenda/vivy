import type { LavalinkSource } from '@app/link';
import type { QueueType } from '@app/player';

export enum ResponseType {
  MESSAGE = 'message',
  PLAY = 'play'
}

interface N8NBaseWebhookResponse {
  type: ResponseType;
}

interface N8NMessageWebhookResponse extends N8NBaseWebhookResponse {
  type: ResponseType.MESSAGE;
  message: string;
}

interface N8NPlayWebhookResponse extends N8NBaseWebhookResponse {
  type: ResponseType.PLAY;
  message: string;
  query: string;
  source: LavalinkSource;
  queueType: QueueType;
}

export type N8NWebhookResponse = N8NMessageWebhookResponse | N8NPlayWebhookResponse;

export enum ResponsePrompt {
  NOT_IN_VOICE_CHANNEL = 'Tell the human that it needs to be in a voice channel for you to play a music or song',
  TRACK_LOAD_GIVEUP = 'Tell the human that you gave up looking up the music or song',
  TRACK_LOAD_EMPTY = 'Tell the human that looking up the music or song came up empty',
  TRACK_LOAD_PLAYLIST = 'Tell the human that you have given a playlist and will play it accordingly'
}
