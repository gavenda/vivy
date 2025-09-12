export enum QueueType {
  LATER = 'later',
  NEXT = 'next',
  NOW = 'now',
  ASK = 'ask'
}

export type QueueTypes = QueueType.LATER | QueueType.NEXT | QueueType.NOW | QueueType.ASK;
