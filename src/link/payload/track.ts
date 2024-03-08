import { Exception } from '.';

export interface Track<UserData> {
  encoded: string | null;
  info: TrackInfo;
  userData: UserData;
}

export interface TrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  artworkUrl: string | null;
  isrc: string | null;
  sourceName: string;
}

export interface PlaylistInfo {
  name: string;
  selectedTrack: number;
}

export enum LoadResultType {
  TRACK = 'track',
  PLAYLIST = 'playlist',
  SEARCH = 'search',
  EMPTY = 'empty',
  ERROR = 'error'
}

export interface LoadResult {
  loadType: LoadResultType;
}

export interface TrackLoadResult<UserData> extends LoadResult {
  loadType: LoadResultType.TRACK;
  data: Track<UserData>;
}

export interface PlaylistLoadResult<UserData> extends LoadResult {
  loadType: LoadResultType.PLAYLIST;
  info: PlaylistInfo;
  data: {
    info: PlaylistInfo;
    tracks: Track<UserData>[];
  };
}

export interface SearchLoadResult<UserData> extends LoadResult {
  loadType: LoadResultType.SEARCH;
  data: Track<UserData>[];
}

export interface EmptyLoadResult extends LoadResult {
  loadType: LoadResultType.EMPTY;
}

export interface ErrorLoadResult extends LoadResult {
  loadType: LoadResultType.ERROR;
  data: Exception;
}

export type LavalinkTrackLoadResult<UserData> =
  | TrackLoadResult<UserData>
  | PlaylistLoadResult<UserData>
  | SearchLoadResult<UserData>
  | EmptyLoadResult
  | ErrorLoadResult;
