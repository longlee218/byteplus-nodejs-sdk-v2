import { describe, it, expect } from "vitest";
import type { HttpRequest, HttpResponse } from "@byteplus-sdk/core";
import { VodV1Client } from "../src/index.js";

// Fixed inputs shared with the Python fixtures generated from
// byteplus-sdk-python (commit eddcf2b) with a patched clock 20230101T000000Z.
const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
const client = (httpClient?: (r: HttpRequest) => Promise<HttpResponse>) =>
  new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK, httpClient });

const okBody = '{"ResponseMetadata":{"RequestId":"r"},"Result":{}}';
const recorder = () => {
  const box: { req?: HttpRequest } = {};
  const http = async (req: HttpRequest): Promise<HttpResponse> => {
    box.req = req;
    return { status: 200, headers: {}, body: okBody };
  };
  return { box, http };
};

const parseQuery = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

describe("VodV1Client dispatch", () => {
  it("throws 'no such api' for an unregistered action", () => {
    expect(() => client().getSignUrl("NotARealAction")).toThrow("no such api");
  });

  it("getSignUrl matches the Python SignerV4.sign_url output (byte-identical params incl. X-Signature)", () => {
    // Python fixture (see scratchpad byteplus-sdk-python, patched clock):
    const pythonFixture =
      "Action=GetPlayInfo&Version=2023-01-01&Vid=v-fixture-001&X-Date=20230101T000000Z&X-NotSignBody=&X-Credential=AKTESTFIXTURE%2F20230101%2Fap-singapore-1%2Fvod%2Frequest&X-Algorithm=HMAC-SHA256&X-SignedHeaders=&X-SignedQueries=Action%3BVersion%3BVid%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-NotSignBody%3BX-SignedHeaders%3BX-SignedQueries&X-Signature=a46cace09bcd8baaf58134b9713331884a4ee133ee2f702b1eb2baf7512d041f";
    const expected = Object.fromEntries(new URLSearchParams(pythonFixture));

    const got = Object.fromEntries(
      new URLSearchParams(client().getSignUrl("GetPlayInfo", { Vid: "v-fixture-001" })),
    );
    expect(got).toEqual(expected);
    expect(got["X-Signature"]).toBe("a46cace09bcd8baaf58134b9713331884a4ee133ee2f702b1eb2baf7512d041f");
  });

  it("GET signs headers matching Python SignerV4.sign (Authorization byte-identical)", async () => {
    const { box, http } = recorder();
    await client(http).get("GetPlayInfo", { Vid: "v-fixture-001" });

    expect(box.req?.method).toBe("GET");
    expect(box.req?.headers["X-Date"]).toBe("20230101T000000Z");
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=host;x-content-sha256;x-date, " +
        "Signature=3344775e63b0aa121e79cfd0d177f3ad2ce2b8f5b7583a36b5b7832885c2f0bd",
    );
    expect(box.req?.headers["Host"]).toBe("vod.byteplusapi.com");
    expect(parseQuery(box.req!.url)).toMatchObject({
      Action: "GetPlayInfo",
      Version: "2023-01-01",
      Vid: "v-fixture-001",
    });
    expect(box.req?.url.startsWith("https://vod.byteplusapi.com/?")).toBe(true);
  });

  it("POST form dispatch puts Action+Version in query and form in the urlencoded body", async () => {
    const { box, http } = recorder();
    await client(http).post("ParseUploadManifest", undefined, { SpaceName: "s", Uri: "tos://x" });

    expect(box.req?.method).toBe("POST");
    expect(box.req?.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(parseQuery(box.req!.url)).toMatchObject({ Action: "ParseUploadManifest", Version: "2023-01-01" });
    const form = Object.fromEntries(new URLSearchParams(box.req?.body ?? ""));
    expect(form).toEqual({ SpaceName: "s", Uri: "tos://x" });
  });

  it("POST json signs a Python-json.dumps body (byte-identical to Python SignerV4.sign)", async () => {
    const { box, http } = recorder();
    await client(http).json("GetVodMediaPlayData", undefined, { Vids: ["a", "b"] });

    expect(box.req?.headers["Content-Type"]).toBe("application/json");
    // Body must use Python json.dumps spacing (it is signed), not compact JSON.
    expect(box.req?.body).toBe('{"Vids": ["a", "b"]}');
    expect(box.req?.headers["X-Content-Sha256"]).toBe(
      "29d0e21029444e932fbf15eefabc1d9acccbd8f88c7ffd097b3163d1c15273f4",
    );
    expect(box.req?.headers["Authorization"]).toBe(
      "HMAC-SHA256 Credential=AKTESTFIXTURE/20230101/ap-singapore-1/vod/request, " +
        "SignedHeaders=content-type;host;x-content-sha256;x-date, " +
        "Signature=c6b8363f08acd5d1ac420383e49dcfdfce51d883712f3b5ca928bb1a16e1b962",
    );
    expect(parseQuery(box.req!.url)).toMatchObject({ Action: "GetVodMediaPlayData", Version: "2025-04-01" });
  });

  it("resolves the ap-southeast-1 host", () => {
    const c = new VodV1Client({ ak: AK, sk: SK, region: "ap-southeast-1", clock: CLOCK });
    expect(c.host).toBe("vod.ap-southeast-1.byteplusapi.com");
  });
});
