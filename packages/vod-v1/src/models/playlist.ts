// Playlist models (media B). Ported from the Python v1 proto. Update-op wrapper
// fields (StringValue) are modeled as plain optionals.

import type { VodResponse, VodMetadataResponse } from "./common.js";

export interface CreatePlaylistRequest {
  SpaceName?: string;
  Name?: string;
  Format?: string;
  Codec?: string;
  Definition?: string;
  Vids?: string;
  StartTime?: string;
  EndTime?: string;
  Cycles?: string;
}
export interface VodCreatePlaylistResult {
  Id?: string;
}
export type CreatePlaylistResponse = VodResponse<VodCreatePlaylistResult>;

export interface GetPlaylistsRequest {
  SpaceName?: string;
  Ids?: string;
  Name?: string;
  Limit?: number;
  Offset?: number;
}
export interface VodPlaylistVideoInfo {
  Vid?: string;
  Title?: string;
  Duration?: number;
  PosterUrl?: string;
  VideoStatus?: string;
}
export interface VodPlaylistInfo {
  Id?: string;
  Name?: string;
  Format?: string;
  Codec?: string;
  Definition?: string;
  StartTime?: string;
  EndTime?: string;
  Cycles?: string;
  VideoInfos?: VodPlaylistVideoInfo[];
  CreatedAt?: number;
  UpdatedAt?: number;
}
export interface InvalidPlaylist {
  Id?: string;
  ErrorMessage?: string;
}
export interface VodGetPlaylistsResult {
  Playlists?: VodPlaylistInfo[];
  InvalidPlaylists?: InvalidPlaylist[];
  Total?: number;
}
export type GetPlaylistsResponse = VodResponse<VodGetPlaylistsResult>;

export interface UpdatePlaylistRequest {
  SpaceName?: string;
  Id?: string;
  Name?: string;
  Format?: string;
  Codec?: string;
  Definition?: string;
  Vids?: string;
  StartTime?: string;
  EndTime?: string;
  Cycles?: string;
}
export type UpdatePlaylistResponse = VodMetadataResponse;

export interface DeletePlaylistRequest {
  SpaceName?: string;
  Id?: string;
}
export type DeletePlaylistResponse = VodMetadataResponse;
