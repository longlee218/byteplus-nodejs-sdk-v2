// Direct-to-TOS upload transport — a separate path from the signed OpenAPI RPC.
// Raw HTTP PUT to a storage host using the host+uri+Auth returned by
// ApplyUploadInfo. Ports direct_upload + the multipart flow (init/part/merge)
// from byteplus_sdk/vod/VodService, incl. crc32, storage-class headers, and the
// @retry(tries=3, delay=1, backoff=2) behavior. All I/O is injectable.

import { openSync, readSync, closeSync, statSync } from "node:fs";
import { crc32 } from "node:zlib";
import { StorageClassType } from "../models/business.js";

/** 20 MiB — below this, upload directly; at/above, use multipart. */
export const MIN_CHUNK_SIZE = 1024 * 1024 * 20;

export interface TosPutRequest {
  url: string;
  headers: Record<string, string>;
  body?: Buffer;
}
export interface TosPutResponse {
  status: number;
  body: string;
}
/** Injectable byte-PUT client (default: global fetch). */
export type TosPutClient = (req: TosPutRequest) => Promise<TosPutResponse>;

export const defaultTosPut: TosPutClient = async (req) => {
  const res = await fetch(req.url, { method: "PUT", headers: req.headers, body: req.body });
  return { status: res.status, body: await res.text() };
};

/** Injectable sleep for retry backoff (tests pass a no-op). */
export type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** zlib crc32 masked to 32 bits, lowercase hex, zero-padded to 8 (Python `%08x`). */
export function crc32Hex(data: Buffer): string {
  return ((crc32(data) >>> 0) >>> 0).toString(16).padStart(8, "0");
}

function storageHeaders(base: Record<string, string>, isLargeFile: boolean, storageClass: number): Record<string, string> {
  const h = { ...base };
  if (isLargeFile) h["X-Storage-Mode"] = "gateway";
  if (storageClass === StorageClassType.Archive) h["X-Upload-Storage-Class"] = "archive";
  return h;
}

async function putWithRetry(put: TosPutClient, sleep: Sleep, req: TosPutRequest): Promise<TosPutResponse> {
  let delay = 1000;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await put(req);
      const ok = res.status === 200 && safeSuccess(res.body);
      if (!ok) throw new Error(`TOS PUT failed: status=${res.status} body=${res.body}`);
      return res;
    } catch (err) {
      if (attempt >= 2) throw err;
      await sleep(delay);
      delay *= 2;
    }
  }
}

function safeSuccess(body: string): boolean {
  try {
    return (JSON.parse(body) as { success?: number }).success === 0;
  } catch {
    return false;
  }
}

export interface TransferOpts {
  put?: TosPutClient;
  sleep?: Sleep;
  minChunkSize?: number;
}

/** Direct single-PUT upload (< MIN_CHUNK_SIZE). */
export async function directUpload(
  host: string,
  oid: string,
  auth: string,
  data: Buffer,
  storageClass: number,
  opts: TransferOpts = {},
): Promise<void> {
  const put = opts.put ?? defaultTosPut;
  const sleep = opts.sleep ?? realSleep;
  const headers = storageHeaders({ "Content-CRC32": crc32Hex(data), Authorization: auth }, false, storageClass);
  // Archive-only header on the direct path (no X-Storage-Mode); mirror Python.
  delete headers["X-Storage-Mode"];
  await putWithRetry(put, sleep, { url: `https://${host}/${oid}`, headers, body: data });
}

/** Multipart upload (>= MIN_CHUNK_SIZE): init -> parts -> merge. */
export async function chunkUpload(
  filePath: string,
  host: string,
  oid: string,
  auth: string,
  size: number,
  storageClass: number,
  opts: TransferOpts = {},
): Promise<void> {
  const put = opts.put ?? defaultTosPut;
  const sleep = opts.sleep ?? realSleep;
  const chunk = opts.minChunkSize ?? MIN_CHUNK_SIZE;
  const isLargeFile = true; // upload_tob always passes is_large_file=True for chunked

  // init
  const initHeaders = storageHeaders({ Authorization: auth }, isLargeFile, storageClass);
  const init = await putWithRetry(put, sleep, { url: `https://${host}/${oid}?uploads`, headers: initHeaders });
  const uploadId = (JSON.parse(init.body) as { payload: { uploadID: string } }).payload.uploadID;

  const n = Math.floor(size / chunk);
  let lastNum = n - 1;
  const parts: string[] = [];
  let meta: unknown = {};
  const fd = openSync(filePath, "r");
  try {
    for (let i = 0; i < lastNum; i++) {
      const data = readChunk(fd, chunk);
      const partNumber = i + 1; // 1-based for large files
      const payload = await uploadPart(put, sleep, host, oid, auth, uploadId, partNumber, data, storageClass);
      if (partNumber === 1) meta = payload.meta;
      parts.push(payload.crc);
    }
    const rest = readRest(fd);
    lastNum += 1;
    const payload = await uploadPart(put, sleep, host, oid, auth, uploadId, lastNum, rest, storageClass);
    if (lastNum === 1) meta = payload.meta;
    parts.push(payload.crc);
  } finally {
    closeSync(fd);
  }

  const objectContentType = (meta as { ObjectContentType?: string } | undefined)?.ObjectContentType ?? "";
  const mergeHeaders = storageHeaders({ Authorization: auth }, isLargeFile, storageClass);
  const mergeBody = Buffer.from(parts.map((c, i) => `${i}:${c}`).join(","), "utf-8");
  await putWithRetry(put, sleep, {
    url: `https://${host}/${oid}?uploadID=${uploadId}&ObjectContentType=${objectContentType}`,
    headers: mergeHeaders,
    body: mergeBody,
  });
}

async function uploadPart(
  put: TosPutClient,
  sleep: Sleep,
  host: string,
  oid: string,
  auth: string,
  uploadId: string,
  partNumber: number,
  data: Buffer,
  storageClass: number,
): Promise<{ crc: string; meta: unknown }> {
  const crc = crc32Hex(data);
  const headers = storageHeaders({ "Content-CRC32": crc, Authorization: auth }, true, storageClass);
  const res = await putWithRetry(put, sleep, {
    url: `https://${host}/${oid}?partNumber=${partNumber}&uploadID=${uploadId}`,
    headers,
    body: data,
  });
  return { crc, meta: (JSON.parse(res.body) as { payload?: { meta?: unknown } }).payload?.meta };
}

function readChunk(fd: number, size: number): Buffer {
  const buf = Buffer.alloc(size);
  const read = readSync(fd, buf, 0, size, null);
  return read === size ? buf : buf.subarray(0, read);
}

function readRest(fd: number): Buffer {
  const chunks: Buffer[] = [];
  const buf = Buffer.alloc(64 * 1024);
  for (;;) {
    const read = readSync(fd, buf, 0, buf.length, null);
    if (read <= 0) break;
    chunks.push(Buffer.from(buf.subarray(0, read)));
  }
  return Buffer.concat(chunks);
}

export { statSync };
