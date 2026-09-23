// VodUploadV1 — upload OpenAPI RPC ops (US-014) + the direct-to-TOS transport
// (US-015: upload_media / upload_tob orchestration over tos-transport). STS
// minting (get_upload_sts2) is deferred to a follow-up slice.

import { readFileSync } from "node:fs";
import type { VodV1Client } from "../client.js";
import { parseM3u8Manifest, uploadM3u8Segments } from "./m3u8.js";
import { rpcGet, rpcPostForm } from "./rpc.js";
import {
  directUpload,
  chunkUpload,
  statSync,
  MIN_CHUNK_SIZE,
  type TransferOpts,
} from "./tos-transport.js";
import { allowStatement, type Policy, type SecurityToken2 } from "./sts.js";
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
  UploadMediaRequest,
  UploadMaterialRequest,
  UploadTobResult,
} from "../models/upload.js";

const FILE_TYPE_OBJECT = "object";

export class VodUploadV1 {
  constructor(
    protected readonly client: VodV1Client,
    private readonly transfer: TransferOpts = {},
  ) {}

  // ---- OpenAPI RPC ops -----------------------------------------------------

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

  // ---- Direct-to-TOS transport ---------------------------------------------

  /**
   * Upload a local file: ApplyUploadInfo → direct (< 20 MiB) or multipart PUT to
   * the returned TOS host → returns `{ oid, sessionKey }` to commit with.
   */
  async uploadTob(
    spaceName: string,
    filePath: string,
    fileType: string,
    fileName: string,
    fileExtension: string,
    storageClass: number,
    uploadHostPrefer: string,
  ): Promise<UploadTobResult> {
    const apply = await this.applyUploadInfo({
      SpaceName: spaceName,
      FileType: fileType,
      FileName: fileName,
      FileExtension: fileExtension,
      StorageClass: storageClass,
      UploadHostPrefer: uploadHostPrefer,
    });
    if (apply.ResponseMetadata.Error?.Code) throw new Error(JSON.stringify(apply.ResponseMetadata.Error));
    const addr = apply.Result.Data?.UploadAddress;
    const store = addr?.StoreInfos?.[0];
    const host = addr?.UploadHosts?.[0];
    if (!store?.StoreUri || !store.Auth || !host || addr?.SessionKey === undefined) {
      throw new Error("ApplyUploadInfo returned an incomplete UploadAddress");
    }
    const oid = store.StoreUri;
    const size = statSync(filePath).size;
    const minChunk = this.transfer.minChunkSize ?? MIN_CHUNK_SIZE;
    if (size < minChunk) {
      await directUpload(host, oid, store.Auth, readFileSync(filePath), storageClass, this.transfer);
    } else {
      await chunkUpload(filePath, host, oid, store.Auth, size, storageClass, this.transfer);
    }
    return { oid, sessionKey: addr.SessionKey };
  }

  /** Upload a raw material file (FileType-tagged) → CommitUploadInfo. Storage class fixed 0. */
  async uploadMaterial(req: UploadMaterialRequest): Promise<CommitUploadInfoResponse> {
    const { sessionKey } = await this.uploadTob(
      req.SpaceName ?? "",
      req.FilePath ?? "",
      req.FileType ?? "",
      req.FileName ?? "",
      req.FileExtension ?? "",
      0,
      req.UploadHostPrefer ?? "",
    );
    const commit = await this.commitUploadInfo({
      SpaceName: req.SpaceName,
      SessionKey: sessionKey,
      Functions: req.Functions,
      CallbackArgs: req.CallbackArgs,
    });
    if (commit.ResponseMetadata.Error?.Code) throw new Error(JSON.stringify(commit.ResponseMetadata.Error));
    return commit;
  }

  /** Mint an STS2 upload token scoped to Apply/CommitUploadInfo (default 1h). */
  getUploadSts2(): SecurityToken2 {
    return this.getUploadSts2WithExpiredTime(60 * 60);
  }

  getUploadSts2WithExpiredTime(expireSeconds: number): SecurityToken2 {
    const policy: Policy = { statements: [allowStatement(["vod:ApplyUploadInfo", "vod:CommitUploadInfo"], [])] };
    return this.client.signSts2(policy, expireSeconds);
  }

  /** High-level upload: optional m3u8 segment upload → uploadTob → CommitUploadInfo. */
  async uploadMedia(req: UploadMediaRequest): Promise<CommitUploadInfoResponse> {
    const filePath = req.FilePath ?? "";
    if (req.SupportParseManifest && filePath.toLowerCase().endsWith(".m3u8")) {
      const segments = await parseM3u8Manifest(
        (content) => this.parseUploadManifest({ SpaceName: req.SpaceName, ManifestContent: content }),
        filePath,
      );
      const sleep = this.transfer.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
      await uploadM3u8Segments(
        (segPath, fileName, fileExt) =>
          this.uploadTob(req.SpaceName ?? "", segPath, FILE_TYPE_OBJECT, fileName, fileExt, req.StorageClass ?? 0, req.UploadHostPrefer ?? ""),
        sleep,
        req,
        segments,
      );
    }
    const { sessionKey } = await this.uploadTob(
      req.SpaceName ?? "",
      filePath,
      "",
      req.FileName ?? "",
      req.FileExtension ?? "",
      req.StorageClass ?? 0,
      req.UploadHostPrefer ?? "",
    );
    const commit = await this.commitUploadInfo({
      SpaceName: req.SpaceName,
      SessionKey: sessionKey,
      Functions: req.Functions,
      CallbackArgs: req.CallbackArgs,
    });
    if (commit.ResponseMetadata.Error?.Code) throw new Error(JSON.stringify(commit.ResponseMetadata.Error));
    return commit;
  }
}
