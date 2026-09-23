import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodQualityV1 } from "../src/index.js";

const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
const rec = (body: string) => {
  const box: { req?: HttpRequest } = {};
  const http = async (req: HttpRequest): Promise<HttpResponse> => {
    box.req = req;
    return { status: 200, headers: {}, body };
  };
  return { box, http };
};
const quality = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodQualityV1(new VodV1Client({ ak: "AKTESTFIXTURE", sk: "SKTESTFIXTURE", region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodQualityV1", () => {
  it("getVodMediaPlayData signs a Python-json.dumps body (byte-identical to Python)", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { TotalPoint: 1, Columns: [{ Name: "play_count", Type: "int" }], Data: [{ play_count: 5, vid: "v-1" }] },
    });
    const { box, http } = rec(canned);
    const resp = await quality(http).getVodMediaPlayData({
      AppID: "app1",
      Platform: "ios",
      Metrics: ["play_count"],
      Filter: { Field: "vid", Op: "eq", Values: ["v-1"] },
    });

    expect(query(box.req!.url)).toMatchObject({ Action: "GetVodMediaPlayData", Version: "2025-04-01" });
    expect(box.req?.headers["Content-Type"]).toBe("application/json");
    expect(box.req?.body).toBe(
      '{"AppID": "app1", "Platform": "ios", "Metrics": ["play_count"], "Filter": {"Field": "vid", "Op": "eq", "Values": ["v-1"]}}',
    );
    expect(box.req?.headers["X-Content-Sha256"]).toBe(
      "82f759ef560aad607ee84e54111c5fc5ac9d6234fa7f8db4cfda8cf9247d0033",
    );
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=content-type;host;x-content-sha256;x-date, " +
        "Signature=f407f2b703e2b086cec4bbdabcf9996d85a4759e5b40c4aa066ded46a66e7fc2",
    );
    expect(resp.Result.Data?.[0]?.["play_count"]).toBe(5);
    expect(resp.Result.Columns?.[0]?.Name).toBe("play_count");
  });

  it("VodV1 facade exposes quality", () => {
    const sdk = new VodV1({ ak: "a", sk: "b", region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.quality).toBeInstanceOf(VodQualityV1);
  });
});
