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

/** Render a JS number as Python `str(float)` — integer-valued doubles get `.0`. */
function pyFloat(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return Number.isInteger(n) ? `${n}.0` : String(n);
}

export class VodSpaceV1 {
  constructor(protected readonly client: VodV1Client) {}

  createSpace(req: CreateSpaceRequest): Promise<CreateSpaceResponse> {
    return rpcGet(this.client, "CreateSpace", req);
  }
  listSpace(req: ListSpaceRequest): Promise<ListSpaceResponse> {
    // Offset/Limit are proto `double`: Python renders them via float `str()`
    // (10 → "10.0"). JS numbers lose the int/float distinction, so pre-render
    // them the Python way here to keep the signed query byte-identical.
    return rpcGet(this.client, "ListSpace", { ...req, Offset: pyFloat(req.Offset), Limit: pyFloat(req.Limit) });
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
