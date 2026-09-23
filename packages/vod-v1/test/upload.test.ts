import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodUploadV1 } from "../src/index.js";

const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));

const rec = (body: string) => {
  const box: { req?: HttpRequest } = {};
  const http = async (req: HttpRequest): Promise<HttpResponse> => {
    box.req = req;
    return { status: 200, headers: {}, body };
  };
  return { box, http };
};
const svc = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodUploadV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodUploadV1 RPC ops", () => {
  it("applyUploadInfo (GET) signs and parses the UploadAddress tree", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { RequestId: "r", Error: { Code: "" } },
      Result: { Data: { UploadAddress: { SessionKey: "sk-1", StoreInfos: [{ StoreUri: "tos://o", Auth: "a" }], UploadHosts: ["h1"] } } },
    });
    const { box, http } = rec(canned);
    const resp = await svc(http).applyUploadInfo({ SpaceName: "space-1", FileType: "video" });

    expect(box.req?.method).toBe("GET");
    expect(query(box.req!.url)).toMatchObject({ Action: "ApplyUploadInfo", Version: "2023-01-01", SpaceName: "space-1" });
    expect(box.req?.headers["Authorization"]?.includes("Credential=AKTESTFIXTURE/")).toBe(true);
    expect(resp.Result.Data?.UploadAddress?.SessionKey).toBe("sk-1");
    expect(resp.Result.Data?.UploadAddress?.StoreInfos?.[0]?.StoreUri).toBe("tos://o");
  });

  it("commitUploadInfo parses the SourceInfo tree", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { Data: { Vid: "v-9", SourceInfo: { FileId: "f", Duration: 12.5, Width: 1920 } } },
    });
    const resp = await svc(rec(canned).http).commitUploadInfo({ SpaceName: "s", SessionKey: "sk-1" });
    expect(resp.Result.Data?.Vid).toBe("v-9");
    expect(resp.Result.Data?.SourceInfo?.Width).toBe(1920);
  });

  it("parseUploadManifest (POST form) matches Python body + signature", async () => {
    const { box, http } = rec('{"ResponseMetadata":{},"Result":{"Data":{"MediaSegments":["a.ts"]}}}');
    await svc(http).parseUploadManifest({ SpaceName: "space-1", ManifestType: "hls", ManifestContent: "#EXTM3U" });

    expect(box.req?.method).toBe("POST");
    expect(box.req?.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(box.req?.body).toBe("SpaceName=space-1&ManifestType=hls&ManifestContent=%23EXTM3U");
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=content-type;host;x-content-sha256;x-date, " +
        "Signature=b6ee9f11293efb92285eb755364f54805fcac384a60abe19ce90ed83c618a46e",
    );
    expect(query(box.req!.url)).toMatchObject({ Action: "ParseUploadManifest", Version: "2023-01-01" });
  });

  it("uploadMediaByUrl (POST form) serializes nested URLSets as a JSON string", async () => {
    const { box, http } = rec('{"ResponseMetadata":{},"Result":{"Data":[{"JobId":"j1","SourceUrl":"http://x/a.mp4"}]}}');
    const resp = await svc(http).uploadMediaByUrl({ SpaceName: "s", URLSets: [{ SourceUrl: "http://x/a.mp4" }] });

    const form = Object.fromEntries(new URLSearchParams(box.req?.body ?? ""));
    expect(form["SpaceName"]).toBe("s");
    expect(form["URLSets"]).toBe('[{"SourceUrl": "http://x/a.mp4"}]');
    expect(resp.Result.Data?.[0]?.JobId).toBe("j1");
  });

  it("VodV1 facade exposes upload", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.upload).toBeInstanceOf(VodUploadV1);
  });
});
