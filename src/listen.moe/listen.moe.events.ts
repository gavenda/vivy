import type { Awaitable } from '@app/utils';

export interface ListenMoeEvents {
  /**
   * Emitted when track information is updated.
   */
  trackUpdate: () => Awaitable<void>;
}
