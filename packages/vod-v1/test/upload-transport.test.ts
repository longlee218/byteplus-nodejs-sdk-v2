import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1Client, VodUploadV1 } from "../src/index.js";
import { crc32Hex, type TosPutRequest, type TosPutResponse } from "../src/services/tos-transport.js";

const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const noSleep = async () => {};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vodv1-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// Client whose HttpClient answers ApplyUploadInfo / CommitUploadInfo by Action.
function rpcClient(host = "tos-host", auth = "AUTH-TOKEN", oid = "obj/uri") {
  return new VodV1Client({
    ak: AK,
    sk: SK,
    region: "ap-singapore-1",
    httpClient: async (req: HttpRequest): Promise<HttpResponse> => {
      const action = new URLSearchParams(req.url.split("?")[1]).get("Action");
      if (action === "ApplyUploadInfo") {
        return {
          status: 200,
          headers: {},
          body: JSON.stringify({
            ResponseMetadata: { Error: { Code: "" } },
            Result: { Data: { UploadAddress: { SessionKey: "sess-1", UploadHosts: [host], StoreInfos: [{ StoreUri: oid, Auth: auth }] } } },
          }),
        };
      }
      return { status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: { Data: { Vid: "v-out" } } }) };
    },
  });
}

// A TOS PUT recorder that returns stage-appropriate success bodies.
function tosRecorder() {
  const reqs: TosPutRequest[] = [];
  const put = async (req: TosPutRequest): Promise<TosPutResponse> => {
    reqs.push(req);
    if (req.url.includes("?uploads")) return { status: 200, body: JSON.stringify({ success: 0, payload: { uploadID: "up-1" } }) };
    if (req.url.includes("partNumber=")) return { status: 200, body: JSON.stringify({ success: 0, payload: { meta: { ObjectContentType: "video/mp4" } } }) };
    return { status: 200, body: JSON.stringify({ success: 0 }) };
  };
  return { reqs, put };
}

describe("crc32Hex", () => {
  it('matches Python "%08x" % (zlib.crc32(b"hello") & 0xffffffff)', () => {
    expect(crc32Hex(Buffer.from("hello"))).toBe("3610a686");
  });
});

describe("VodUploadV1 direct upload", () => {
  it("PUTs the file bytes to https://host/oid with Content-CRC32 + Auth", async () => {
    const file = join(dir, "small.mp4");
    writeFileSync(file, Buffer.from("hello"));
    const { reqs, put } = tosRecorder();
    const up = new VodUploadV1(rpcClient(), { put, sleep: noSleep });

    const res = await up.uploadTob("space", file, "", "small.mp4", ".mp4", 0, "");
    expect(res).toEqual({ oid: "obj/uri", sessionKey: "sess-1" });
    expect(reqs).toHaveLength(1);
    expect(reqs[0]!.url).toBe("https://tos-host/obj/uri");
    expect(reqs[0]!.headers["Content-CRC32"]).toBe("3610a686");
    expect(reqs[0]!.headers["Authorization"]).toBe("AUTH-TOKEN");
    expect(reqs[0]!.body?.toString()).toBe("hello");
  });

  it("adds X-Upload-Storage-Class: archive for the Archive class (no X-Storage-Mode on direct)", async () => {
    const file = join(dir, "a.mp4");
    writeFileSync(file, Buffer.from("x"));
    const { reqs, put } = tosRecorder();
    await new VodUploadV1(rpcClient(), { put, sleep: noSleep }).uploadTob("s", file, "", "a.mp4", ".mp4", 2, "");
    expect(reqs[0]!.headers["X-Upload-Storage-Class"]).toBe("archive");
    expect(reqs[0]!.headers["X-Storage-Mode"]).toBeUndefined();
  });
});

describe("VodUploadV1 multipart upload", () => {
  it("init → 1-based parts → merge with the crc list", async () => {
    const file = join(dir, "big.bin");
    writeFileSync(file, Buffer.from("ABCDEFGHIJ")); // 10 bytes
    const { reqs, put } = tosRecorder();
    // minChunkSize 4 → n=floor(10/4)=2, loop range(0,1) → part 1 (4B), remainder → part 2 (6B)
    await new VodUploadV1(rpcClient(), { put, sleep: noSleep, minChunkSize: 4 }).uploadTob("s", file, "", "big.bin", ".bin", 0, "");

    const urls = reqs.map((r) => r.url);
    expect(urls[0]).toBe("https://tos-host/obj/uri?uploads");
    expect(urls.some((u) => u.includes("partNumber=1&uploadID=up-1"))).toBe(true);
    expect(urls.some((u) => u.includes("partNumber=2&uploadID=up-1"))).toBe(true);
    const merge = reqs.at(-1)!;
    expect(merge.url).toBe("https://tos-host/obj/uri?uploadID=up-1&ObjectContentType=video/mp4");
    // merge body: "0:crc0,1:crc1"
    expect(merge.body?.toString()).toMatch(/^0:[0-9a-f]{8},1:[0-9a-f]{8}$/);
    expect(reqs.every((r) => r.headers["X-Storage-Mode"] === "gateway")).toBe(true);
  });
});

describe("VodUploadV1.uploadMedia", () => {
  it("uploads then commits with the session key", async () => {
    const file = join(dir, "m.mp4");
    writeFileSync(file, Buffer.from("data"));
    const { put } = tosRecorder();
    const commit = await new VodUploadV1(rpcClient(), { put, sleep: noSleep }).uploadMedia({ SpaceName: "s", FilePath: file, FileName: "m.mp4" });
    expect(commit.Result.Data?.Vid).toBe("v-out");
  });
});
