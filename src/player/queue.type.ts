export enum QueueType {
  LATER = 'later',
  NEXT = 'next',
  NOW = 'now'
}

export type QueueTypes = QueueType.LATER | QueueType.NEXT | QueueType.NOW;
