import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodSpaceV1 } from "../src/index.js";

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
const space = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodSpaceV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-southeast-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodSpaceV1", () => {
  it("listSpace uses Version 2023-07-01 and parses the space array Result", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: [{ SpaceName: "s1", Region: "ap-southeast-1", CanUseArchive: true }],
    });
    const { box, http } = rec(canned);
    const resp = await space(http).listSpace({ Limit: 10, Offset: 5, ProjectName: "default" });

    expect(query(box.req!.url)).toMatchObject({ Action: "ListSpace", Version: "2023-07-01", ProjectName: "default" });
    expect(resp.Result[0]?.SpaceName).toBe("s1");
    expect(resp.Result[0]?.CanUseArchive).toBe(true);
  });

  it("listSpace renders double Offset/Limit as Python floats and signs byte-identically", async () => {
    const { box, http } = rec(JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: [] }));
    const c = new VodSpaceV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
    await c.listSpace({ Limit: 10, Offset: 5, ProjectName: "default" });

    const q = query(box.req!.url);
    expect(q["Offset"]).toBe("5.0");
    expect(q["Limit"]).toBe("10.0");
    // Byte-identical to Python `list_space` (patched clock, same creds).
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=host;x-content-sha256;x-date, " +
        "Signature=aa263b981bb8585cb2461e258768a2c95997ffcc536c19708c76b549edacbce1",
    );
  });

  it("getSpaceDetail parses the space info", async () => {
    const canned = JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: { SpaceName: "s1", BucketName: "b1" } });
    const { box, http } = rec(canned);
    const resp = await space(http).getSpaceDetail({ SpaceName: "s1" });
    expect(query(box.req!.url)["Version"]).toBe("2023-07-01");
    expect(resp.Result.BucketName).toBe("b1");
  });

  it("createSpace + updateSpaceUploadConfig hit their Actions (metadata-only)", async () => {
    const cs = rec('{"ResponseMetadata":{"Error":{"Code":""}}}');
    await space(cs.http).createSpace({ SpaceName: "s2", Region: "ap-southeast-1" });
    expect(query(cs.box.req!.url)).toMatchObject({ Action: "CreateSpace", SpaceName: "s2" });

    const uc = rec('{"ResponseMetadata":{"Error":{"Code":""}}}');
    await space(uc.http).updateSpaceUploadConfig({ SpaceName: "s2", ConfigKey: "k", ConfigValue: "v" });
    expect(query(uc.box.req!.url)).toMatchObject({ Action: "UpdateSpaceUploadConfig", ConfigKey: "k" });
  });

  it("describeVodSpaceStorageData parses the storage series", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { SpaceList: ["s1"], LatestStorageData: 1024, StorageDataList: [{ Time: "t", Storage: 512 }] },
    });
    const resp = await space(rec(canned).http).describeVodSpaceStorageData({ SpaceList: "s1", StartTime: "a", EndTime: "b" });
    expect(resp.Result.LatestStorageData).toBe(1024);
    expect(resp.Result.StorageDataList?.[0]?.Storage).toBe(512);
  });

  it("VodV1 facade exposes space", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.space).toBeInstanceOf(VodSpaceV1);
  });
});
