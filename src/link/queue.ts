import { Track } from './payload';

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

  /**
   * Creates a queue.
   */
  constructor(tracks: Track<UserData>[] = []) {
    this.tracks = tracks;
  }

  slice(start: number, end?: number) {
    this.tracks = this.tracks.slice(start, end);
    this.offset = 0;
  }

  peek(index: number) {
    return this.size > 0 ? this.tracks[index] : null;
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
   * Clears the queue.
   */
  clear() {
    this.tracks = [];
    this.offset = 0;
  }

  /**
   * Creates a shallow copy of the queue.
   */
  clone(): TrackQueue<UserData> {
    return new TrackQueue<UserData>(this.tracks.slice(this.offset));
  }

  /**
   * Creates a queue from an existing array.
   */
  static fromArray<UserData>(tracks: Track<UserData>[]): TrackQueue<UserData> {
    return new TrackQueue<UserData>(tracks);
  }
}
