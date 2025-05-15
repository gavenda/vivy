import { Lavalink } from './link';
import type { Track } from './payload';
import type { TrackState } from './track.state';

export interface TrackQueueOptions<UserData> {
  link: Lavalink<UserData>;
  guildId: string;
}

/**
 * @license MIT
 * @copyright 2020 Eyas Ranjous <eyas.ranjous@gmail.com>
 * @link https://github.com/datastructures-js/queue
 *
 * Modified for use in tracks.
 */
export class TrackQueue<UserData> {
  private tracks: Track<UserData>[];
  private offset: number = 0;

  current: Track<UserData> | null = null;
  previous: Track<UserData> | null = null;

  link: Lavalink<UserData>;
  guildId: string;

  /**
   * Creates a queue.
   */
  constructor(tracks: Track<UserData>[], options: TrackQueueOptions<UserData>) {
    this.guildId = options.guildId;
    this.link = options.link;
    this.tracks = tracks;
  }

  private get stateKey() {
    return `player:queue:${this.guildId}`;
  }

  private get state(): TrackState<UserData> {
    return {
      current: this.current,
      previous: this.previous,
      tracks: this.tracks,
      offset: this.offset
    };
  }

  slice(start: number, end?: number) {
    this.tracks = this.tracks.slice(this.offset + start, end);
    this.offset = 0;
  }

  /**
   * Peek to a track in the queue.
   * @param index the index to peek
   */
  peek(index: number) {
    return this.size > 0 ? this.tracks[this.offset + index] : null;
  }

  /**
   * Adds a track to the back of the queue.
   */
  enqueue(...track: Track<UserData>[]) {
    this.tracks.push(...track);
    return this;
  }

  /**
   * Adds a track to the start of the queue.
   */
  enqueueNext(track: Track<UserData>) {
    this.tracks.unshift(track);
    this.offset = 0;
    return this;
  }

  /**
   * Dequeues the front track in the queue.
   */
  dequeue(): Track<UserData> | null {
    if (this.size === 0) return null;

    const first = this.next;
    this.previous = this.current;
    this.current = first;
    this.offset += 1;

    if (this.offset * 2 < this.tracks.length) return first;

    // only remove dequeued tracks when reaching half size
    // to decrease latency of shifting tracks.
    this.tracks = this.tracks.slice(this.offset);
    this.offset = 0;
    return first;
  }

  /**
   * Returns the next playing track.
   */
  get next(): Track<UserData> | null {
    return this.size > 0 ? this.tracks[this.offset] : null;
  }

  /**
   * Returns the last track in the queue.
   */
  get last(): Track<UserData> | null {
    return this.size > 0 ? this.tracks[this.tracks.length - 1] : null;
  }

  /**
   * Returns the number of tracks in the queue.
   */
  get size(): number {
    return this.tracks.length - this.offset;
  }

  /**
   * Checks if the queue is empty.
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Returns the remaining tracks in the queue as an array.
   */
  toArray(): Track<UserData>[] {
    return this.tracks.slice(this.offset);
  }

  /**
   * Shuffle the queue.
   */
  shuffle() {
    if (this.tracks.length == 2) {
      [this.tracks[0], this.tracks[1]] = [this.tracks[1], this.tracks[0]];
    } else {
      let currentIndex = this.tracks.length;
      let currentElement: Track<UserData>;

      while (currentIndex != 0) {
        // Pick a remaining element
        const randomIndex = Math.floor(Math.random() * currentIndex--);
        // And swap it with the current element
        currentElement = this.tracks[currentIndex];
        this.tracks[currentIndex] = this.tracks[randomIndex];
        this.tracks[randomIndex] = currentElement;
      }
    }
    this.offset = 0;
  }

  /**
   * Total duration of the tracks in the queue.
   */
  get duration(): number {
    const current = this.current?.info.length ?? 0;
    return (
      current +
      this.tracks
        .filter((track) => track.info.isSeekable)
        .reduce((accumulator, track) => accumulator + track.info.length, 0)
    );
  }

  /**
   * Saves the queue state.
   */
  async saveState() {
    const redis = this.link.redis;
    const stateStr = JSON.stringify(this.state);
    await redis.set(this.stateKey, stateStr);
  }

  /**
   * Synchronizes the queue state.
   */
  async syncState() {
    const redis = this.link.redis;
    const stateStr = await redis.get(this.stateKey);

    if (!stateStr) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const state: TrackState<UserData> = JSON.parse(stateStr);

    this.current = state.current;
    this.previous = state.previous;
    this.tracks = state.tracks;
    this.offset = state.offset;
  }

  /**
   * Clears the queue.
   */
  async clear() {
    this.tracks = [];
    this.offset = 0;
    // Clear remote state
    await this.link.redis.del(this.stateKey);
  }

  /**
   * Creates a shallow copy of the queue.
   */
  clone(): TrackQueue<UserData> {
    return new TrackQueue<UserData>(this.tracks.slice(this.offset), { guildId: this.guildId, link: this.link });
  }
}
