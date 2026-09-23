import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1Client, VodCdnV1 } from "../src/index.js";

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
  new VodCdnV1(new VodV1Client({ ak: "AKTESTFIXTURE", sk: "SKTESTFIXTURE", region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));
const ok = (result: unknown) => JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: result });

describe("VodCdnV1 (domain/CDN B)", () => {
  it("listCdnTopAccess uses Version 2023-07-01 and parses item infos", async () => {
    const { box, http } = rec(ok({ ItemInfos: [{ ItemKey: "/a.mp4", Value: 12.5 }] }));
    const resp = await cdn(http).listCdnTopAccess({ Domains: "d1", Item: "url", StartTimestamp: 1, EndTimestamp: 2 });
    expect(query(box.req!.url)).toMatchObject({ Action: "ListCdnTopAccess", Version: "2023-07-01" });
    expect(resp.Result.ItemInfos?.[0]?.ItemKey).toBe("/a.mp4");
  });

  it("listCdnUsageData / listCdnStatusData / listCdnPvData share the statistics result", async () => {
    const body = ok({ Datas: [{ Name: "d1", Metric: "flux", Points: [{ Timestamp: 1000, Value: 42 }] }], NoPermissionDomains: [] });
    for (const call of [
      (c: VodCdnV1) => c.listCdnUsageData({ Domains: "d1", Metric: "flux" }),
      (c: VodCdnV1) => c.listCdnStatusData({ Domains: "d1", Metric: "4xx" }),
      (c: VodCdnV1) => c.listCdnPvData({ Domains: "d1" }),
    ]) {
      const resp = await call(cdn(rec(body).http));
      expect(resp.Result.Datas?.[0]?.Points?.[0]?.Value).toBe(42);
    }
  });

  it("describeVodDomainBandwidthData parses the bandwidth series", async () => {
    const resp = await cdn(rec(ok({ PeakBandwidth: 999, BandwidthDataList: [{ Time: "t", Bandwidth: 100 }] })).http)
      .describeVodDomainBandwidthData({ DomainList: "d1", StartTime: "a", EndTime: "b" });
    expect(resp.Result.PeakBandwidth).toBe(999);
    expect(resp.Result.BandwidthDataList?.[0]?.Bandwidth).toBe(100);
  });

  it("describeIpInfo parses the array Result", async () => {
    const { box, http } = rec(ok([{ Ip: "1.2.3.4", CdnIp: true, Isp: "x" }]));
    const resp = await cdn(http).describeIpInfo({ Ips: "1.2.3.4" });
    expect(query(box.req!.url)["Action"]).toBe("DescribeIpInfo");
    expect(resp.Result[0]?.CdnIp).toBe(true);
  });

  it("listCdnAccessLog + listCdnTopAccessUrl parse their trees", async () => {
    const al = await cdn(rec(ok({ Logs: [{ Domain: "d1", LogList: [{ FileName: "log1", FileSize: 10 }] }] })).http)
      .listCdnAccessLog({ Domains: "d1", StartTimestamp: 1, EndTimestamp: 2 });
    expect(al.Result.Logs?.[0]?.LogList?.[0]?.FileName).toBe("log1");
    const tu = await cdn(rec(ok({ UrlInfos: [{ Url: "/x", Pv: 5, Flux: 100 }] })).http)
      .listCdnTopAccessUrl({ Domains: "d1", SortType: "pv" });
    expect(tu.Result.UrlInfos?.[0]?.Pv).toBe(5);
  });
});
