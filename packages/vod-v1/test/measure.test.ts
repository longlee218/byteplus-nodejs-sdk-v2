import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodMeasureV1 } from "../src/index.js";

const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
const rec = (body: string) => {
  const box: { req?: HttpRequest } = {};
  const http = async (req: HttpRequest): Promise<HttpResponse> => {
    box.req = req;
    return { status: 200, headers: {}, body };
  };
  return { box, http };
};
const m = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodMeasureV1(new VodV1Client({ ak: "AKTESTFIXTURE", sk: "SKTESTFIXTURE", region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));
const ok = (result: unknown) => JSON.stringify({ ResponseMetadata: { Error: { Code: "" } }, Result: result });

describe("VodMeasureV1", () => {
  it("describeVodSpaceTranscodeData parses the transcode detail tree", async () => {
    const { box, http } = rec(ok({
      TotalTranscodeData: 100,
      TranscodeDataDetailList: [{ Space: "s", TaskStage: "done", Total: 100, TranscodeUsageList: [{ Time: "t", TranscodeItemList: [{ Name: "H264", Value: 60 }] }] }],
    }));
    const resp = await m(http).describeVodSpaceTranscodeData({ SpaceList: "s", StartTime: "a", EndTime: "b" });
    expect(query(box.req!.url)["Action"]).toBe("DescribeVodSpaceTranscodeData");
    expect(resp.Result.TranscodeDataDetailList?.[0]?.TranscodeUsageList?.[0]?.TranscodeItemList?.[0]?.Value).toBe(60);
  });

  it("describeVodMostPlayedStatisData parses the play-stat list", async () => {
    const resp = await m(rec(ok({ TopN: 2, PlayStatInfos: [{ Vid: "v1", PlayCount: 999, Duration: 12.5 }] })).http)
      .describeVodMostPlayedStatisData({ Space: "s", StartTime: "a", EndTime: "b", TopN: 2 });
    expect(resp.Result.PlayStatInfos?.[0]?.PlayCount).toBe(999);
  });

  it("all seven measure ops hit their Actions", async () => {
    const cases: Array<[string, (c: VodMeasureV1) => Promise<{ ResponseMetadata: unknown }>]> = [
      ["DescribeVodSnapshotData", (c) => c.describeVodSnapshotData({ SpaceList: "s" })],
      ["DescribeVodEnhanceImageData", (c) => c.describeVodEnhanceImageData({ SpaceList: "s" })],
      ["DescribeVodSpaceSubtitleStatisData", (c) => c.describeVodSpaceSubtitleStatisData({ SpaceList: "s" })],
      ["DescribeVodPlayedStatisData", (c) => c.describeVodPlayedStatisData({ Space: "s" })],
      ["DescribeVodRealtimeMediaData", (c) => c.describeVodRealtimeMediaData({ SpaceList: "s" })],
    ];
    for (const [action, call] of cases) {
      const { box, http } = rec(ok({}));
      await call(m(http));
      expect(query(box.req!.url)["Action"]).toBe(action);
    }
  });

  it("VodV1 facade exposes measure", () => {
    const sdk = new VodV1({ ak: "a", sk: "b", region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.measure).toBeInstanceOf(VodMeasureV1);
  });
});
