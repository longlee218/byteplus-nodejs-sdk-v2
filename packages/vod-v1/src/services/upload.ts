// VodUploadV1 — upload OpenAPI RPC ops. The direct-to-TOS transport
// (upload_media orchestration, multipart PUT) is US-015 and will extend this.
// Ports apply/commit/query (GET) and upload-by-url/parse-manifest (POST form).

import type { VodV1Client } from "../client.js";
import { rpcGet, rpcPostForm } from "./rpc.js";
import type {
  ApplyUploadInfoRequest,
  ApplyUploadInfoResponse,
  CommitUploadInfoRequest,
  CommitUploadInfoResponse,
  QueryUploadTaskInfoRequest,
  QueryUploadTaskInfoResponse,
  UploadMediaByUrlRequest,
  UploadMediaByUrlResponse,
  ParseUploadManifestRequest,
  ParseUploadManifestResponse,
} from "../models/upload.js";

export class VodUploadV1 {
  constructor(protected readonly client: VodV1Client) {}

  applyUploadInfo(req: ApplyUploadInfoRequest): Promise<ApplyUploadInfoResponse> {
    return rpcGet(this.client, "ApplyUploadInfo", req);
  }

  commitUploadInfo(req: CommitUploadInfoRequest): Promise<CommitUploadInfoResponse> {
    return rpcGet(this.client, "CommitUploadInfo", req);
  }

  queryUploadTaskInfo(req: QueryUploadTaskInfoRequest): Promise<QueryUploadTaskInfoResponse> {
    return rpcGet(this.client, "QueryUploadTaskInfo", req);
  }

  uploadMediaByUrl(req: UploadMediaByUrlRequest): Promise<UploadMediaByUrlResponse> {
    return rpcPostForm(this.client, "UploadMediaByUrl", req);
  }

  parseUploadManifest(req: ParseUploadManifestRequest): Promise<ParseUploadManifestResponse> {
    return rpcPostForm(this.client, "ParseUploadManifest", req);
  }
}
