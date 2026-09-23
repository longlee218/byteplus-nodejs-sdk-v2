import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodMediaV1 } from "../src/index.js";

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
const media = (http?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodMediaV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient: http }));
const query = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodMediaV1", () => {
  it("getMediaInfos serializes boolean NeedSmartInfo=True and signs it (Python differential)", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { MediaInfoList: [{ BasicInfo: { Vid: "v1", Title: "t" } }], NotExistVids: ["v2"] },
    });
    const { box, http } = rec(canned);
    const resp = await media(http).getMediaInfos({ Vids: "v1,v2", NeedSmartInfo: true });

    expect(query(box.req!.url)["NeedSmartInfo"]).toBe("True");
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=host;x-content-sha256;x-date, " +
        "Signature=9c2e11e2c66644e8468afbd3f578bbf7b0a3594fe3e7ac8c6e86359b6231b580",
    );
    expect(resp.Result.MediaInfoList?.[0]?.BasicInfo?.Vid).toBe("v1");
    expect(resp.Result.NotExistVids).toEqual(["v2"]);
  });

  it("getMediaList hits GetMediaList and parses the paged data tree", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { SpaceName: "s", TotalCount: 1, Offset: 0, PageSize: 10, MediaInfoList: [{ BasicInfo: { Vid: "v9" } }] },
    });
    const { box, http } = rec(canned);
    const resp = await media(http).getMediaList({ SpaceName: "s", PageSize: "10" });
    expect(query(box.req!.url)).toMatchObject({ Action: "GetMediaList", SpaceName: "s", PageSize: "10" });
    expect(resp.Result.TotalCount).toBe(1);
    expect(resp.Result.MediaInfoList?.[0]?.BasicInfo?.Vid).toBe("v9");
  });

  it("updateMediaInfo hits UpdateMediaInfo with the fields in the query", async () => {
    const { box, http } = rec('{"ResponseMetadata":{"Error":{"Code":""}}}');
    await media(http).updateMediaInfo({ Vid: "v1", Title: "New", ClassificationId: 42 });
    expect(query(box.req!.url)).toMatchObject({ Action: "UpdateMediaInfo", Vid: "v1", Title: "New", ClassificationId: "42" });
  });

  it("deleteMedia + deleteTranscodes parse their NotExist lists", async () => {
    const del = await media(rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"NotExistVids":["x"]}}').http).deleteMedia({ Vids: "x,y" });
    expect(del.Result.NotExistVids).toEqual(["x"]);
    const dt = await media(rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"NotExistFileIds":["f"]}}').http).deleteTranscodes({ Vid: "v1", FileIds: "f" });
    expect(dt.Result.NotExistFileIds).toEqual(["f"]);
  });

  it("VodV1 facade exposes media", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.media).toBeInstanceOf(VodMediaV1);
  });
});
