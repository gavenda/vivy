/**
 * Where the client keeps what it needs to pick up a session after a restart:
 * the node session ids, the player states and the queues.
 */
export interface LavalinkStateStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  /**
   * The keys matching a glob style pattern, e.g. `player:state:host:*`.
   */
  keys(pattern: string): Promise<string[]>;
}
