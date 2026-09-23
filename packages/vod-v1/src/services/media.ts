// VodMediaV1 — media management (A: info/list/update/delete; B: subtitle,
// classifications, playlists, files) + the subtitle auth-token builder.

import { pyJsonStringify } from "@byteplus-sdk/core";
import type { VodV1Client } from "../client.js";
import { rpcGet, rpcPostForm } from "./rpc.js";
import { base64, withExpires } from "./token-util.js";
import type {
  UpdateMediaInfoRequest,
  UpdateMediaInfoResponse,
  UpdateMediaPublishStatusRequest,
  UpdateMediaPublishStatusResponse,
  GetMediaInfosRequest,
  GetMediaInfosResponse,
  GetMediaListRequest,
  GetMediaListResponse,
  DeleteMediaRequest,
  DeleteMediaResponse,
  DeleteTranscodesRequest,
  DeleteTranscodesResponse,
  ListVideoClassificationsRequest,
  ListVideoClassificationsResponse,
} from "../models/media.js";
import type {
  GetSubtitleInfoListRequest,
  GetSubtitleInfoListResponse,
  UpdateSubtitleStatusRequest,
  UpdateSubtitleStatusResponse,
  UpdateSubtitleInfoRequest,
  UpdateSubtitleInfoResponse,
} from "../models/subtitle.js";
import type {
  CreatePlaylistRequest,
  CreatePlaylistResponse,
  GetPlaylistsRequest,
  GetPlaylistsResponse,
  UpdatePlaylistRequest,
  UpdatePlaylistResponse,
  DeletePlaylistRequest,
  DeletePlaylistResponse,
} from "../models/playlist.js";
import type {
  GetFileInfosRequest,
  GetFileInfosResponse,
  DeleteMediaTosFileRequest,
  DeleteMediaTosFileResponse,
  ListFileMetaInfosByFileNamesRequest,
  ListFileMetaInfosByFileNamesResponse,
} from "../models/file.js";

export class VodMediaV1 {
  constructor(protected readonly client: VodV1Client) {}

  // ---- media A -------------------------------------------------------------

  updateMediaInfo(req: UpdateMediaInfoRequest): Promise<UpdateMediaInfoResponse> {
    return rpcGet(this.client, "UpdateMediaInfo", req);
  }
  updateMediaPublishStatus(req: UpdateMediaPublishStatusRequest): Promise<UpdateMediaPublishStatusResponse> {
    return rpcGet(this.client, "UpdateMediaPublishStatus", req);
  }
  getMediaInfos(req: GetMediaInfosRequest): Promise<GetMediaInfosResponse> {
    return rpcGet(this.client, "GetMediaInfos", req);
  }
  getMediaList(req: GetMediaListRequest): Promise<GetMediaListResponse> {
    return rpcGet(this.client, "GetMediaList", req);
  }
  deleteMedia(req: DeleteMediaRequest): Promise<DeleteMediaResponse> {
    return rpcGet(this.client, "DeleteMedia", req);
  }
  deleteTranscodes(req: DeleteTranscodesRequest): Promise<DeleteTranscodesResponse> {
    return rpcGet(this.client, "DeleteTranscodes", req);
  }
  listVideoClassifications(req: ListVideoClassificationsRequest): Promise<ListVideoClassificationsResponse> {
    return rpcGet(this.client, "ListVideoClassifications", req);
  }

  // ---- subtitle ------------------------------------------------------------

  getSubtitleInfoList(req: GetSubtitleInfoListRequest): Promise<GetSubtitleInfoListResponse> {
    return rpcGet(this.client, "GetSubtitleInfoList", req);
  }
  updateSubtitleStatus(req: UpdateSubtitleStatusRequest): Promise<UpdateSubtitleStatusResponse> {
    return rpcGet(this.client, "UpdateSubtitleStatus", req);
  }
  updateSubtitleInfo(req: UpdateSubtitleInfoRequest): Promise<UpdateSubtitleInfoResponse> {
    return rpcGet(this.client, "UpdateSubtitleInfo", req);
  }

  /** base64({"GetSubtitleAuthToken":<signed GetSubtitleInfoList URL>}); Status forced to "Published". */
  getSubtitleAuthToken(req: { Vid?: string }, expire: number): string {
    if (!req.Vid) throw new Error("Vid is None");
    const params = withExpires({ Vid: req.Vid, Status: "Published" }, expire);
    const token = this.client.getSignUrl("GetSubtitleInfoList", params);
    return base64(pyJsonStringify({ GetSubtitleAuthToken: token }));
  }

  // ---- playlists -----------------------------------------------------------

  createPlaylist(req: CreatePlaylistRequest): Promise<CreatePlaylistResponse> {
    return rpcGet(this.client, "CreatePlaylist", req);
  }
  getPlaylists(req: GetPlaylistsRequest): Promise<GetPlaylistsResponse> {
    return rpcGet(this.client, "GetPlaylists", req);
  }
  updatePlaylist(req: UpdatePlaylistRequest): Promise<UpdatePlaylistResponse> {
    return rpcGet(this.client, "UpdatePlaylist", req);
  }
  deletePlaylist(req: DeletePlaylistRequest): Promise<DeletePlaylistResponse> {
    return rpcGet(this.client, "DeletePlaylist", req);
  }

  // ---- files ---------------------------------------------------------------

  getFileInfos(req: GetFileInfosRequest): Promise<GetFileInfosResponse> {
    return rpcGet(this.client, "GetFileInfos", req);
  }
  deleteMediaTosFile(req: DeleteMediaTosFileRequest): Promise<DeleteMediaTosFileResponse> {
    return rpcPostForm(this.client, "DeleteMediaTosFile", req);
  }
  listFileMetaInfosByFileNames(req: ListFileMetaInfosByFileNamesRequest): Promise<ListFileMetaInfosByFileNamesResponse> {
    return rpcPostForm(this.client, "ListFileMetaInfosByFileNames", req);
  }
}
