import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1, VodV1Client, VodPlaybackV1 } from "../src/index.js";

const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));

const mk = (httpClient?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodPlaybackV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient }));

const q = (s: string) => Object.fromEntries(new URLSearchParams(s));

describe("VodPlaybackV1 token builders (Python differential)", () => {
  it("getPlayAuthToken matches Python get_play_auth_token", () => {
    // Python fixture (patched clock 20230101T000000Z), base64-decoded payload:
    const pyToken =
      "Action=GetPlayInfo&Version=2023-01-01&Vid=v-fixture-001&X-Expires=3600&X-Date=20230101T000000Z&X-NotSignBody=&X-Credential=AKTESTFIXTURE%2F20230101%2Fap-singapore-1%2Fvod%2Frequest&X-Algorithm=HMAC-SHA256&X-SignedHeaders=&X-SignedQueries=Action%3BVersion%3BVid%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-Expires%3BX-NotSignBody%3BX-SignedHeaders%3BX-SignedQueries&X-Signature=69752a6b061a7e7934eef7936ff5dfe8b2517c7c3fdcc5ab3107e31ea162016d";

    const out = mk().getPlayAuthToken({ Vid: "v-fixture-001" }, 3600);
    const decoded = JSON.parse(Buffer.from(out, "base64").toString("utf-8"));
    expect(decoded.TokenVersion).toBe("V2");
    expect(q(decoded.GetPlayInfoToken)).toEqual(q(pyToken));
    expect(q(decoded.GetPlayInfoToken)["X-Signature"]).toBe(
      "69752a6b061a7e7934eef7936ff5dfe8b2517c7c3fdcc5ab3107e31ea162016d",
    );
  });

  it("getSha1HlsDrmAuthToken matches Python (DrmAuthToken + signed URL)", () => {
    const out = mk().getSha1HlsDrmAuthToken(3600);
    const got = q(out);
    expect(got["DrmAuthToken"]).toBe("HMAC-SHA1:2.0:1672534800:AKTESTFIXTURE:aF+tfrNNXzfqH7N2e10miG3wSTc=");
    expect(got["X-Signature"]).toBe("b52f123a055e71f3dede4e2c79ef867d1df93b3cd98276252e909fd1ab2942d2");
    expect(got["Action"]).toBe("GetHlsDecryptionKey");
    expect(got["X-Expires"]).toBe("3600");
  });

  it("createHlsDrmAuthToken rejects expire 0 and non-SHA1 algorithms", () => {
    expect(() => mk().createHlsDrmAuthToken("HMAC-SHA1", 0)).toThrow("invalid expire");
    expect(() => mk().createHlsDrmAuthToken("HMAC-SHA256", 3600)).toThrow("invalid authAlgorithm");
  });

  it("getPrivateDrmPlayAuthToken returns a raw signed URL (no base64 wrapper)", () => {
    const out = mk().getPrivateDrmPlayAuthToken({ DrmType: "widevine", Vid: "v-1" }, 0);
    const got = q(out);
    expect(got["Action"]).toBe("GetPrivateDrmPlayAuth");
    expect(got["Vid"]).toBe("v-1");
    expect(got["X-Expires"]).toBeUndefined(); // expire=0 -> not added
    expect(typeof got["X-Signature"]).toBe("string");
  });
});

describe("VodPlaybackV1 RPC ops", () => {
  const canned = JSON.stringify({
    ResponseMetadata: { RequestId: "req-1", Action: "GetPlayInfo", Error: { Code: "" } },
    Result: { Vid: "v-1", Status: 10, PlayInfoList: [{ FileId: "f1", Bitrate: 900, MainPlayUrl: "https://x/1.mp4" }] },
  });

  it("getPlayInfo signs the request and returns the typed response tree", async () => {
    const box: { req?: HttpRequest } = {};
    const http = async (req: HttpRequest): Promise<HttpResponse> => {
      box.req = req;
      return { status: 200, headers: {}, body: canned };
    };
    const resp = await mk(http).getPlayInfo({ Vid: "v-1" });

    expect(box.req?.headers["Authorization"]?.startsWith("HMAC-SHA256 Credential=AKTESTFIXTURE/")).toBe(true);
    expect(Object.fromEntries(new URLSearchParams(box.req!.url.split("?")[1]))).toMatchObject({
      Action: "GetPlayInfo",
      Version: "2023-01-01",
      Vid: "v-1",
    });
    expect(resp.Result.Vid).toBe("v-1");
    expect(resp.Result.PlayInfoList?.[0]?.FileId).toBe("f1");
    expect(resp.ResponseMetadata.RequestId).toBe("req-1");
  });

  it("VodV1 facade exposes playback", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.playback).toBeInstanceOf(VodPlaybackV1);
  });
});
