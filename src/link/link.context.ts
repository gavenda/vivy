import { createClient } from 'redis';

export interface LinkContext {
  redis: ReturnType<typeof createClient>;
}
