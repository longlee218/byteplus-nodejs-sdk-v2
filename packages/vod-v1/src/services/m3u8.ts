// m3u8 manifest parsing + segment upload for VodUploadV1.uploadMedia. Extracted
// to keep the upload service under the file-size limit. Ports parse_m3u8_manifest
// (recursive, via ParseUploadManifest) and upload_m3u8_segments (per-segment retry).

import { readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import type { ParseUploadManifestResponse, UploadMediaRequest } from "../models/upload.js";

export interface M3u8Segment {
  filePath: string;
  fileName: string;
}

/** Recursively parse a local m3u8 into segment file entries via ParseUploadManifest. */
export async function parseM3u8Manifest(
  parse: (content: string) => Promise<ParseUploadManifestResponse>,
  manifestPath: string,
): Promise<M3u8Segment[]> {
  const segments: M3u8Segment[] = [];
  const seen = new Set<string>();
  const walk = async (currentPath: string, prefix: string): Promise<void> => {
    const content = readFileSync(currentPath, "utf-8");
    const resp = await parse(content);
    if (resp.ResponseMetadata.Error?.Code) throw new Error(JSON.stringify(resp.ResponseMetadata.Error));
    const dir = dirname(currentPath);
    for (const segment of resp.Result.Data?.MediaSegments ?? []) {
      const segPath = join(dir, segment);
      if (seen.has(segPath)) continue;
      seen.add(segPath);
      const fileName = prefix ? join(prefix, segment) : segment;
      if (segPath.toLowerCase().endsWith(".m3u8")) {
        const sub = dirname(fileName);
        await walk(segPath, sub === "." ? "" : sub);
      }
      segments.push({ filePath: segPath, fileName });
    }
  };
  await walk(manifestPath, "");
  return segments;
}

/** Upload each segment via `uploadTob`, retrying up to 2× (3 attempts) — Python parity. */
export async function uploadM3u8Segments(
  uploadTob: (filePath: string, fileName: string, fileExtension: string) => Promise<unknown>,
  sleep: (ms: number) => Promise<void>,
  req: UploadMediaRequest,
  segments: M3u8Segment[],
): Promise<void> {
  const prefix = req.FileName ? (dirname(req.FileName) === "." ? "" : dirname(req.FileName) + "/") : "";
  const maxRetries = 2;
  for (const seg of segments) {
    const fileName = prefix + seg.fileName;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await uploadTob(seg.filePath, fileName, extname(fileName));
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < maxRetries) await sleep(1000);
      }
    }
    if (lastErr !== undefined) throw lastErr;
  }
}
