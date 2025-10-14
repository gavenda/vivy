import type { Track } from './payload';

export interface TrackState<UserData> {
  current: Track<UserData> | undefined;
  previous: Track<UserData> | undefined;
  tracks: Track<UserData>[];
  offset: number;
}
