import { Track } from './payload';

export interface TrackState<UserData> {
  current: Track<UserData> | null;
  previous: Track<UserData> | null;
  tracks: Track<UserData>[];
  offset: number;
}
