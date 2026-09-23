import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodCdnV1 } from "../src/index.js";

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
const cdn = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodCdnV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodCdnV1 (domain/CDN A)", () => {
  it("listCdnTasks sends wire Action ListCDNTasks, signed like Python", async () => {
    const { box, http } = rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"TotalCount":0,"ContentInfos":[]}}');
    await cdn(http).listCdnTasks({ SpaceName: "s", TaskType: "refresh" });

    expect(query(box.req!.url)["Action"]).toBe("ListCDNTasks");
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=host;x-content-sha256;x-date, " +
        "Signature=e3168fd9d83bc47cac8c8d6062a07af2fbd654798e9fc8f5ab6f422646273d2e",
    );
  });

  it("listDomain parses the domain config tree", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: {
        SpaceName: "s",
        Total: 1,
        PlayInstanceInfo: { ByteInstances: [{ InstanceId: "i1", Domains: [{ Domain: "cdn.example.com", Status: "online" }] }] },
      },
    });
    const resp = await cdn(rec(canned).http).listDomain({ SpaceName: "s", Limit: 10 });
    expect(resp.Result.PlayInstanceInfo?.ByteInstances?.[0]?.Domains?.[0]?.Domain).toBe("cdn.example.com");
  });

  it("createDomain sends nested Origin and returns metadata-only", async () => {
    const { box, http } = rec('{"ResponseMetadata":{"Error":{"Code":""}}}');
    await cdn(http).createDomain({
      SpaceName: "s",
      Domain: "cdn.example.com",
      Origin: [{ OriginAction: { OriginLines: [{ Address: "1.2.3.4", InstanceType: "ip" }] } }],
    });
    expect(query(box.req!.url)["Action"]).toBe("CreateDomain");
    // nested Origin serialized as a Python json.dumps string
    expect(query(box.req!.url)["Origin"]).toBe('[{"OriginAction": {"OriginLines": [{"Address": "1.2.3.4", "InstanceType": "ip"}]}}]');
  });

  it("createCdnRefreshTask / createCdnPreloadTask return the task id", async () => {
    const rf = await cdn(rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"TaskId":"t1"}}').http).createCdnRefreshTask({ SpaceName: "s", Urls: "https://x/a" });
    expect(rf.Result.TaskId).toBe("t1");
    const pl = await cdn(rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"TaskId":"t2"}}').http).createCdnPreloadTask({ SpaceName: "s", Urls: "https://x/b" });
    expect(pl.Result.TaskId).toBe("t2");
  });

  it("VodV1 facade exposes cdn", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.cdn).toBeInstanceOf(VodCdnV1);
  });
});
