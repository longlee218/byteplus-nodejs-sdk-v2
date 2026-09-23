// VodMediaV1 — media-management ops (A): info / list / update / delete. All GET
// RPC. Ports update_media_info, update_media_publish_status, get_media_infos,
// get_media_list, delete_media, delete_transcodes.

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";
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
} from "../models/media.js";

export class VodMediaV1 {
  constructor(protected readonly client: VodV1Client) {}

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
}
