import type { Awaitable } from 'vivy/utils';
import type { RadioType } from './listen.moe';

export interface ListenMoeEvents {
  /**
   * Emitted when the song a radio is playing is updated.
   * @param type the radio that updated
   */
  trackUpdate: (type: RadioType) => Awaitable<void>;
}
