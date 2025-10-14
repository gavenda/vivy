import type { Awaitable } from 'vivy/utils';

export interface ListenMoeEvents {
  /**
   * Emitted when track information is updated.
   */
  trackUpdate: () => Awaitable<void>;
}
