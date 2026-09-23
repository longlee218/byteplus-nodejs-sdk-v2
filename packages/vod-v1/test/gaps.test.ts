import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodUploadV1, VodMediaV1, VodV1ApiError } from "../src/index.js";

const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const noSleep = async () => {};
const client = (httpClient?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", httpClient });

// ---- Gap 2: STS minting ----------------------------------------------------

describe("STS minting (signSts2 / getUploadSts2)", () => {
  it("produces a STS2 token with the Python policy string + a valid signature", () => {
    const sts = new VodUploadV1(client()).getUploadSts2();
    expect(sts.SessionToken.startsWith("STS2")).toBe(true);
    expect(sts.AccessKeyId.startsWith("AKTP")).toBe(true);

    const inner = JSON.parse(Buffer.from(sts.SessionToken.slice(4), "base64").toString("utf-8"));
    expect(inner.LTAccessKeyId).toBe(AK);
    expect(inner.AccessKeyId).toBe(sts.AccessKeyId);
    expect(inner.PolicyString).toBe(
      '{"Statement":[{"Action":["vod:ApplyUploadInfo","vod:CommitUploadInfo"],"Effect":"Allow","Resource":[]}]}',
    );

    // The signature must recompute from md5(sk) over "lt|ak|exp|signed|policy".
    const key = createHash("md5").update(SK, "utf-8").digest();
    const signStr = [inner.LTAccessKeyId, inner.AccessKeyId, inner.ExpiredTime, inner.SignedSecretAccessKey, inner.PolicyString].join("|");
    expect(createHmac("sha256", key).update(signStr, "utf-8").digest("hex")).toBe(inner.Signature);
  });

  it("clamps expire below 60s to at least 60s", () => {
    const sts = new VodUploadV1(client()).getUploadSts2WithExpiredTime(1);
    const inner = JSON.parse(Buffer.from(sts.SessionToken.slice(4), "base64").toString("utf-8"));
    expect(inner.ExpiredTime).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000) + 60 - 2);
  });
});

// ---- Gap 3: error contract -------------------------------------------------

describe("error contract (Python parity: message = Error.Code)", () => {
  it("raises VodV1ApiError whose message is the API Error.Code on HTTP error", async () => {
    const http = async (): Promise<HttpResponse> => ({
      status: 400,
      headers: {},
      body: JSON.stringify({ ResponseMetadata: { Error: { Code: "InvalidParameter", Message: "bad vid" } } }),
    });
    const media = new VodMediaV1(client(http));
    await expect(media.getMediaInfos({ Vids: "x" })).rejects.toMatchObject({
      name: "VodV1ApiError",
      message: "InvalidParameter",
      code: "InvalidParameter",
      statusCode: 400,
    });
    await expect(media.getMediaInfos({ Vids: "x" })).rejects.toBeInstanceOf(VodV1ApiError);
  });

  it("passes 200-with-business-error through (caller inspects Error.Code)", async () => {
    const http = async (): Promise<HttpResponse> => ({
      status: 200,
      headers: {},
      body: JSON.stringify({ ResponseMetadata: { Error: { Code: "BizError" } }, Result: {} }),
    });
    const resp = await new VodMediaV1(client(http)).getMediaInfos({ Vids: "x" });
    expect(resp.ResponseMetadata.Error?.Code).toBe("BizError");
  });
});

// ---- Gaps 1 & 4: uploadMaterial + m3u8 per-segment retry -------------------

describe("upload subsystem gap fixes", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "vodv1gap-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // A client whose ApplyUploadInfo can fail the first N times (to exercise retry).
  function rpcClient(applyFailures = 0) {
    let applies = 0;
    return new VodV1Client({
      ak: AK,
      sk: SK,
      region: "ap-singapore-1",
      httpClient: async (req: HttpRequest): Promise<HttpResponse> => {
        const action = new URLSearchParams(req.url.split("?")[1]).get("Action");
        if (action === "ApplyUploadInfo") {
          applies++;
          if (applies <= applyFailures) return { status: 500, headers: {}, body: '{"ResponseMetadata":{"Error":{"Code":"Throttled"}}}' };
          return { status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: { Data: { UploadAddress: { SessionKey: "sk", UploadHosts: ["h"], StoreInfos: [{ StoreUri: "oid", Auth: "a" }] } } } }) };
        }
        if (action === "ParseUploadManifest") return { status: 200, headers: {}, body: '{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"Data":{"MediaSegments":["seg0.ts"]}}}' };
        return { status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: { Data: { Vid: "v-out" } } }) };
      },
    });
  }
  const tosPut = async () => ({ status: 200, body: JSON.stringify({ success: 0 }) });

  it("uploadMaterial uploads (with FileType) then commits", async () => {
    const file = join(dir, "m.bin");
    writeFileSync(file, Buffer.from("data"));
    const up = new VodUploadV1(rpcClient(), { put: tosPut, sleep: noSleep });
    const commit = await up.uploadMaterial({ SpaceName: "s", FilePath: file, FileType: "object", FileName: "m.bin" });
    expect(commit.Result.Data?.Vid).toBe("v-out");
  });

  it("m3u8 segment upload retries a failed ApplyUploadInfo (Python parity)", async () => {
    const m3u8 = join(dir, "v.m3u8");
    writeFileSync(m3u8, "#EXTM3U");
    writeFileSync(join(dir, "seg0.ts"), Buffer.from("seg"));
    // ApplyUploadInfo fails twice (segment upload + retry) then succeeds on attempt 3.
    const up = new VodUploadV1(rpcClient(2), { put: tosPut, sleep: noSleep });
    const commit = await up.uploadMedia({ SpaceName: "s", FilePath: m3u8, FileName: "v.m3u8", SupportParseManifest: true });
    expect(commit.Result.Data?.Vid).toBe("v-out");
  });

  it("m3u8 segment upload throws after exhausting retries", async () => {
    const m3u8 = join(dir, "v.m3u8");
    writeFileSync(m3u8, "#EXTM3U");
    writeFileSync(join(dir, "seg0.ts"), Buffer.from("seg"));
    const up = new VodUploadV1(rpcClient(99), { put: tosPut, sleep: noSleep });
    await expect(up.uploadMedia({ SpaceName: "s", FilePath: m3u8, FileName: "v.m3u8", SupportParseManifest: true })).rejects.toThrow();
  });
});
