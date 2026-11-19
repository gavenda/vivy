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

  current: Track<UserData> | undefined;
  previous: Track<UserData> | undefined;

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

  /**
   * Removes the tracks from `start` up to, not including, `end` in the remaining queue, the rest stay in order.
   * @param start the first index relative to the remaining queue
   * @param end the index after the last one to remove, the end of the queue when omitted
   * @returns the removed tracks
   */
  removeRange(start: number, end = this.size): Track<UserData>[] {
    const from = Math.max(0, start);
    const to = Math.min(this.size, end);

    if (from >= to) return [];

    return this.tracks.splice(this.offset + from, to - from);
  }

  /**
   * Removes one track from the remaining queue.
   * @param index the index relative to the remaining queue
   * @returns the removed track, or `undefined` if the index is out of range
   */
  removeAt(index: number): Track<UserData> | undefined {
    return this.removeRange(index, index + 1)[0];
  }

  /**
   * Peek to a track in the queue.
   * @param index the index to peek
   */
  peek(index: number) {
    return this.size > 0 ? this.tracks[this.offset + index] : undefined;
  }

  /**
   * Adds a track to the back of the queue.
   */
  enqueue(...track: Track<UserData>[]) {
    this.tracks.push(...track);
  }

  /**
   * Adds a track to the start of the queue.
   */
  enqueueNext(track: Track<UserData>) {
    // Ahead of the remaining tracks, not of the played ones still kept behind the offset
    this.tracks.splice(this.offset, 0, track);
  }

  /**
   * Swaps two tracks in the remaining queue.
   * @param indexA The first track index relative to the remaining queue.
   * @param indexB The second track index relative to the remaining queue.
   */
  swap(indexA: number, indexB: number) {
    if (indexA === indexB) return;

    const size = this.size;
    if (indexA < 0 || indexB < 0 || indexA >= size || indexB >= size) return;

    const a = this.offset + indexA;
    const b = this.offset + indexB;

    const trackA = this.tracks[a];
    const trackB = this.tracks[b];

    if (!trackA || !trackB) return;

    this.tracks[a] = trackB;
    this.tracks[b] = trackA;
  }

  /**
   * Dequeues the front track in the queue.
   */
  dequeue(): Track<UserData> | undefined {
    if (this.size === 0) return;

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
  get next(): Track<UserData> | undefined {
    return this.size > 0 ? this.tracks[this.offset] : undefined;
  }

  /**
   * Returns the last track in the queue.
   */
  get last(): Track<UserData> | undefined {
    return this.size > 0 ? this.tracks[this.tracks.length - 1] : undefined;
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
    // Played tracks stay behind the offset, drop them so they don't come back
    this.tracks = this.tracks.slice(this.offset);
    this.offset = 0;

    if (this.tracks.length == 2) {
      if (!this.tracks[0]) return;
      if (!this.tracks[1]) return;

      [this.tracks[0], this.tracks[1]] = [this.tracks[1], this.tracks[0]];
    } else {
      let currentIndex = this.tracks.length;

      while (currentIndex != 0) {
        // Pick a remaining element
        const randomIndex = Math.floor(Math.random() * currentIndex--);

        const track = this.tracks[currentIndex];
        const randomTrack = this.tracks[randomIndex];

        if (!track) continue;
        if (!randomTrack) continue;

        // And swap it with the current element
        this.tracks[currentIndex] = randomTrack;
        this.tracks[randomIndex] = track;
      }
    }
  }

  /**
   * Total duration of the tracks in the queue.
   */
  get duration(): number {
    return [this.current, ...this.toArray()]
      .filter((track) => track && track.info.isSeekable && !track.info.isStream)
      .reduce((accumulator, track) => accumulator + (track?.info.length ?? 0), 0);
  }

  /**
   * Saves the queue state.
   */
  async saveState() {
    const stateStr = JSON.stringify(this.state);
    await this.link.store.set(this.stateKey, stateStr);
  }

  /**
   * Synchronizes the queue state.
   */
  async syncState() {
    const stateStr = await this.link.store.get(this.stateKey);

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
    await this.link.store.del(this.stateKey);
  }

  /**
   * Creates a shallow copy of the queue.
   */
  clone(): TrackQueue<UserData> {
    return new TrackQueue<UserData>(this.tracks.slice(this.offset), { guildId: this.guildId, link: this.link });
  }
}
