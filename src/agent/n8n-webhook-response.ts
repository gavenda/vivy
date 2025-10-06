import type { LavalinkSource } from '@app/link';
import type { QueueType } from '@app/player';

export enum ResponseType {
  MESSAGE = 'message',
  SHUFFLE = 'shuffle',
  PLAY = 'play',
  RESUME = 'resume',
  PAUSE = 'pause',
  DISCONNECT = 'disconnect',
  STOP = 'stop',
  SKIP = 'skip',
  CLEAR_EFFECT = 'clear-effect',
  CLEAR_QUEUE = 'clear-queue',
  REMOVE = 'remove',
  REMOVE_RANGE = 'remove-range'
}

interface N8NBaseWebhookResponse {
  type: ResponseType;
}

interface N8NMessageWebhookResponse extends N8NBaseWebhookResponse {
  type:
    | ResponseType.MESSAGE
    | ResponseType.RESUME
    | ResponseType.PAUSE
    | ResponseType.DISCONNECT
    | ResponseType.STOP
    | ResponseType.SKIP
    | ResponseType.SHUFFLE
    | ResponseType.CLEAR_EFFECT
    | ResponseType.CLEAR_QUEUE;
  message: string;
}

interface N8NPlayWebhookResponse extends N8NBaseWebhookResponse {
  type: ResponseType.PLAY;
  message: string;
  query: string;
  source: LavalinkSource;
  queueType: QueueType;
}

interface N8NRemoveWebhookResponse extends N8NBaseWebhookResponse {
  type: ResponseType.REMOVE;
  message: string;
  from: number;
}

interface N8NRemoveRangeWebhookResponse extends N8NBaseWebhookResponse {
  type: ResponseType.REMOVE_RANGE;
  message: string;
  from: number;
  to: number;
}

export type N8NWebhookResponse =
  | N8NPlayWebhookResponse
  | N8NRemoveRangeWebhookResponse
  | N8NRemoveWebhookResponse
  | N8NMessageWebhookResponse;

export enum ResponsePrompt {
  NOT_IN_VOICE_CHANNEL = 'Tell the human that it needs to be in a voice channel for you to play a music or song',
  TRACK_LOAD_GIVEUP = 'Tell the human that you gave up looking up the music or song',
  TRACK_LOAD_EMPTY = 'Tell the human that looking up the music or song came up empty',
  TRACK_LOAD_PLAYLIST = 'Tell the human that you have given a playlist and will play it accordingly'
}
