// VodSpaceV1 — space-management ops. All GET RPC. Ports create_space,
// list_space, get_space_detail, update_space_upload_config,
// describe_vod_space_storage_data.

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";
import type {
  CreateSpaceRequest,
  CreateSpaceResponse,
  ListSpaceRequest,
  ListSpaceResponse,
  GetSpaceDetailRequest,
  GetSpaceDetailResponse,
  UpdateSpaceUploadConfigRequest,
  UpdateSpaceUploadConfigResponse,
  DescribeVodSpaceStorageDataRequest,
  DescribeVodSpaceStorageDataResponse,
} from "../models/space.js";

export class VodSpaceV1 {
  constructor(protected readonly client: VodV1Client) {}

  createSpace(req: CreateSpaceRequest): Promise<CreateSpaceResponse> {
    return rpcGet(this.client, "CreateSpace", req);
  }
  listSpace(req: ListSpaceRequest): Promise<ListSpaceResponse> {
    return rpcGet(this.client, "ListSpace", req);
  }
  getSpaceDetail(req: GetSpaceDetailRequest): Promise<GetSpaceDetailResponse> {
    return rpcGet(this.client, "GetSpaceDetail", req);
  }
  updateSpaceUploadConfig(req: UpdateSpaceUploadConfigRequest): Promise<UpdateSpaceUploadConfigResponse> {
    return rpcGet(this.client, "UpdateSpaceUploadConfig", req);
  }
  describeVodSpaceStorageData(req: DescribeVodSpaceStorageDataRequest): Promise<DescribeVodSpaceStorageDataResponse> {
    return rpcGet(this.client, "DescribeVodSpaceStorageData", req);
  }
}
