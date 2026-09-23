// VodUploadV1 — upload OpenAPI RPC ops (US-014) + the direct-to-TOS transport
// (US-015: upload_media / upload_tob orchestration over tos-transport). STS
// minting (get_upload_sts2) is deferred to a follow-up slice.

import { readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import type { VodV1Client } from "../client.js";
import { rpcGet, rpcPostForm } from "./rpc.js";
import {
  directUpload,
  chunkUpload,
  statSync,
  MIN_CHUNK_SIZE,
  type TransferOpts,
} from "./tos-transport.js";
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

  /** High-level upload: optional m3u8 segment upload → uploadTob → CommitUploadInfo. */
  async uploadMedia(req: UploadMediaRequest): Promise<CommitUploadInfoResponse> {
    const filePath = req.FilePath ?? "";
    if (req.SupportParseManifest && filePath.toLowerCase().endsWith(".m3u8")) {
      const segments = await this.parseM3u8Manifest(req.SpaceName ?? "", filePath);
      await this.uploadM3u8Segments(req, segments);
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

  /** Recursively parse a local m3u8 (via ParseUploadManifest) into segment file entries. */
  async parseM3u8Manifest(spaceName: string, manifestPath: string): Promise<Array<{ filePath: string; fileName: string }>> {
    const segments: Array<{ filePath: string; fileName: string }> = [];
    const seen = new Set<string>();
    const parse = async (currentPath: string, prefix: string): Promise<void> => {
      const content = readFileSync(currentPath, "utf-8");
      const resp = await this.parseUploadManifest({ SpaceName: spaceName, ManifestContent: content });
      if (resp.ResponseMetadata.Error?.Code) throw new Error(JSON.stringify(resp.ResponseMetadata.Error));
      const dir = dirname(currentPath);
      for (const segment of resp.Result.Data?.MediaSegments ?? []) {
        const segPath = join(dir, segment);
        if (seen.has(segPath)) continue;
        seen.add(segPath);
        const fileName = prefix ? join(prefix, segment) : segment;
        if (segPath.toLowerCase().endsWith(".m3u8")) {
          const sub = dirname(fileName);
          await parse(segPath, sub === "." ? "" : sub);
        }
        segments.push({ filePath: segPath, fileName });
      }
    };
    await parse(manifestPath, "");
    return segments;
  }

  private async uploadM3u8Segments(
    req: UploadMediaRequest,
    segments: Array<{ filePath: string; fileName: string }>,
  ): Promise<void> {
    const prefix = req.FileName ? (dirname(req.FileName) === "." ? "" : dirname(req.FileName) + "/") : "";
    for (const seg of segments) {
      const fileName = prefix + seg.fileName;
      await this.uploadTob(
        req.SpaceName ?? "",
        seg.filePath,
        FILE_TYPE_OBJECT,
        fileName,
        extname(fileName),
        req.StorageClass ?? 0,
        req.UploadHostPrefer ?? "",
      );
    }
  }
}
