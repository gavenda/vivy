import type { Exception } from './payload';

export interface Track<UserData> {
  /**
   * The base64 encoded track data.
   */
  encoded: string | null;
  /**
   * Info about the track.
   */
  info: TrackInfo;
  /**
   * Additional track info provided by plugins.
   */
  pluginInfo: unknown;
  /**
   * Additional track data.
   * @see {@link https://lavalink.dev/api/rest.html#update-player}
   */
  userData: UserData;
}

export interface TrackInfo {
  /**
   * The track identifier.
   */
  identifier: string;
  /**
   * Whether the track is seekable.
   */
  isSeekable: boolean;
  /**
   * The track author.
   */
  author: string;
  /**
   * The track length in milliseconds.
   */
  length: number;
  /**
   * Whether the track is a stream.
   */
  isStream: boolean;
  /**
   * The track position in milliseconds.
   */
  position: number;
  /**
   * The track title.
   */
  title: string;
  /**
   * The track uri.
   */
  uri: string | null;
  /**
   * The track artwork url.
   */
  artworkUrl: string | null;
  /**
   * The track {@link https://en.wikipedia.org/wiki/International_Standard_Recording_Code | ISRC}.
   */
  isrc: string | null;
  /**
   * The track source name.
   */
  sourceName: string;
}

export interface PlaylistInfo {
  /**
   * The name of the playlist.
   */
  name: string;
  /**
   * The selected track of the playlist (-1 if no track is selected).
   */
  selectedTrack: number;
}

export enum LoadResultType {
  /**
   * A track has been loaded.
   */
  TRACK = 'track',
  /**
   * A playlist has been loaded.
   */
  PLAYLIST = 'playlist',
  /**
   * A search result has been loaded.
   */
  SEARCH = 'search',
  /**
   * There has been no matches for your identifier.
   */
  EMPTY = 'empty',
  /**
   * Loading has failed with an error.
   */
  ERROR = 'error'
}

export interface LoadResult {
  /**
   * The type of the result
   */
  loadType: LoadResultType;
}

/**
 * Load result when loadType is {@link LoadResultType.TRACK}
 */
export interface TrackLoadResult<UserData> extends LoadResult {
  loadType: LoadResultType.TRACK;
  data: Track<UserData>;
}

/**
 * Load result when loadType is {@link LoadResultType.PLAYLIST}
 */
export interface PlaylistLoadResult<UserData> extends LoadResult {
  loadType: LoadResultType.PLAYLIST;
  data: {
    /**
     * 	The info of the playlist
     */
    info: PlaylistInfo;
    /**
     * Addition playlist info provided by plugins.
     */
    pluginInfo: unknown;
    /**
     * 	The tracks of the playlist
     */
    tracks: Track<UserData>[];
  };
}

/**
 * Load result when loadType is {@link LoadResultType.SEARCH}
 */
export interface SearchLoadResult<UserData> extends LoadResult {
  loadType: LoadResultType.SEARCH;
  /**
   * Array of Track objects from the search result.
   */
  data: Track<UserData>[];
}

/**
 * Load result when loadType is {@link LoadResultType.EMPTY}
 */
export interface EmptyLoadResult extends LoadResult {
  loadType: LoadResultType.EMPTY;
}

/**
 * Load result when loadType is {@link LoadResultType.ERROR}
 */
export interface ErrorLoadResult extends LoadResult {
  loadType: LoadResultType.ERROR;
  /**
   * Exception object with the error.
   */
  data: Exception;
}

/**
 * Type union for all load results.
 */
export type LavalinkTrackLoadResult<UserData> =
  | TrackLoadResult<UserData>
  | PlaylistLoadResult<UserData>
  | SearchLoadResult<UserData>
  | EmptyLoadResult
  | ErrorLoadResult;
