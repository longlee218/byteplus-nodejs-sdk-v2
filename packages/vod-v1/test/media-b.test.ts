import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodMediaV1, VodV1Client } from "../src/index.js";

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
const q = (s: string) => Object.fromEntries(new URLSearchParams(s));

describe("VodMediaV1 subtitle", () => {
  it("getSubtitleAuthToken matches Python get_subtitle_auth_token", () => {
    const pyToken =
      "Action=GetSubtitleInfoList&Version=2023-01-01&Vid=v-1&Status=Published&X-Expires=300&X-Date=20230101T000000Z&X-NotSignBody=&X-Credential=AKTESTFIXTURE%2F20230101%2Fap-singapore-1%2Fvod%2Frequest&X-Algorithm=HMAC-SHA256&X-SignedHeaders=&X-SignedQueries=Action%3BStatus%3BVersion%3BVid%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-Expires%3BX-NotSignBody%3BX-SignedHeaders%3BX-SignedQueries&X-Signature=576f607b4c7890f844d0def0e34a112f8249d3251df0beb00ff1d2e459cba4e9";
    const out = media().getSubtitleAuthToken({ Vid: "v-1" }, 300);
    const decoded = JSON.parse(Buffer.from(out, "base64").toString("utf-8"));
    expect(q(decoded.GetSubtitleAuthToken)).toEqual(q(pyToken));
    expect(q(decoded.GetSubtitleAuthToken)["X-Signature"]).toBe(
      "576f607b4c7890f844d0def0e34a112f8249d3251df0beb00ff1d2e459cba4e9",
    );
  });

  it("getSubtitleAuthToken throws when Vid is empty", () => {
    expect(() => media().getSubtitleAuthToken({}, 300)).toThrow("Vid is None");
  });

  it("getSubtitleInfoList parses the nested subtitle tree", async () => {
    const canned = JSON.stringify({
      ResponseMetadata: { Error: { Code: "" } },
      Result: { Vid: "v-1", TotalCount: 1, FileSubtitleInfoList: [{ FileId: "f1", SubtitleInfoList: [{ Language: "en", Format: "vtt" }] }] },
    });
    const resp = await media(rec(canned).http).getSubtitleInfoList({ Vid: "v-1" });
    expect(resp.Result.FileSubtitleInfoList?.[0]?.SubtitleInfoList?.[0]?.Language).toBe("en");
  });
});

describe("VodMediaV1 file ops (POST form)", () => {
  it("deleteMediaTosFile encodes the FileNames array as a JSON string, signed like Python", async () => {
    const { box, http } = rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"FailedFileNames":[]}}');
    await media(http).deleteMediaTosFile({ FileNames: ["a.mp4", "b.mp4"], SpaceName: "s" });

    expect(box.req?.method).toBe("POST");
    expect(box.req?.body).toBe("FileNames=%5B%22a.mp4%22%2C+%22b.mp4%22%5D&SpaceName=s");
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=content-type;host;x-content-sha256;x-date, " +
        "Signature=d54e618f9102ea213e53bcdf3339e525610d329e742ab3b0fd6b39cfbffb494c",
    );
    expect(q(box.req!.url.split("?")[1]!)).toMatchObject({ Action: "DeleteMediaTosFile", Version: "2023-07-01" });
  });

  it("listFileMetaInfosByFileNames parses the meta list", async () => {
    const canned = '{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"VodFileMetaInfos":[{"Vid":"v1","FileId":"f1"}]}}';
    const resp = await media(rec(canned).http).listFileMetaInfosByFileNames({ SpaceName: "s", FileNameEncodeds: "x" });
    expect(resp.Result.VodFileMetaInfos?.[0]?.Vid).toBe("v1");
  });
});

describe("VodMediaV1 playlists + classifications", () => {
  it("createPlaylist / getPlaylists / listVideoClassifications hit their Actions", async () => {
    const cp = rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"Id":"p9"}}');
    await media(cp.http).createPlaylist({ SpaceName: "s", Name: "pl", Vids: "v1,v2" });
    expect(q(cp.box.req!.url.split("?")[1]!)["Action"]).toBe("CreatePlaylist");

    const gp = rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"Total":2,"Playlists":[{"Id":"p1"}]}}');
    const resp = await media(gp.http).getPlaylists({ SpaceName: "s", Limit: 10 });
    expect(resp.Result.Playlists?.[0]?.Id).toBe("p1");

    const lc = rec('{"ResponseMetadata":{"Error":{"Code":""}},"Result":{"ClassificationTrees":[{"ClassificationId":1,"Classification":"root"}]}}');
    const cls = await media(lc.http).listVideoClassifications({ SpaceName: "s" });
    expect(cls.Result.ClassificationTrees?.[0]?.Classification).toBe("root");
  });
});
