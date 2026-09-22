import { describe, it, expect } from "vitest";
import {
  ApiClient,
  ApiException,
  Configuration,
  ModelRegistry,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "../src/index.js";

function recorder(responses: HttpResponse[]) {
  const requests: HttpRequest[] = [];
  let i = 0;
  const client: HttpClient = async (req) => {
    requests.push(req);
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r as HttpResponse;
  };
  return { client, requests };
}

const registry = (): ModelRegistry => {
  const r = new ModelRegistry();
  r.register("FakeReq", { attributeMap: { runId: "RunId" }, swaggerTypes: { runId: "str" } });
  r.register("FakeResp", { attributeMap: { runId: "RunId" }, swaggerTypes: { runId: "str" } });
  return r;
};

const FIXED = new Date(Date.UTC(2025, 6, 1, 12, 34, 56));
const baseCfg = (rec: ReturnType<typeof recorder>, reg: ModelRegistry, extra = {}) =>
  new Configuration({
    ak: "AKdummy",
    sk: "SKdummy",
    region: "ap-southeast-1",
    httpClient: rec.client,
    registry: reg,
    clock: () => FIXED,
    sleep: async () => {},
    ...extra,
  });

const ok = (result: unknown): HttpResponse => ({
  status: 200,
  headers: {},
  body: JSON.stringify({ ResponseMetadata: { RequestId: "x" }, Result: result }),
});

describe("ApiClient.callApi pipeline", () => {
  it("builds, signs, and sends a POST json request (and never leaks the secret)", async () => {
    const reg = registry();
    const rec = recorder([ok({ RunId: "r-1" })]);
    const client = new ApiClient(baseCfg(rec, reg));
    const res = await client.callApi<{ runId: string }>({
      resourcePath: "/StartExecution/2025-07-01/vod/post/application_json/",
      method: "POST",
      headerParams: { "Content-Type": "application/json" },
      body: { runId: "r-1" },
      requestType: "FakeReq",
      responseType: "FakeResp",
    });

    const req = rec.requests[0] as HttpRequest;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://vod.ap-southeast-1.byteplusapi.com/?Action=StartExecution&Version=2025-07-01");
    expect(req.headers["Authorization"]).toMatch(/^HMAC-SHA256 Credential=AKdummy\//);
    expect(req.headers["X-Date"]).toBe("20250701T123456Z");
    expect(req.headers["X-Content-Sha256"]).toBeDefined();
    expect(req.headers["Host"]).toBe("vod.ap-southeast-1.byteplusapi.com");
    expect(req.body).toBe('{"RunId": "r-1"}'); // Python json.dumps spacing (parity, US-008)
    expect(res).toEqual({ runId: "r-1" });
    // The secret key must never appear anywhere in the outgoing request.
    expect(JSON.stringify(req)).not.toContain("SKdummy");
  });

  it("flattens the body to the query for GET + text/plain (empty body)", async () => {
    const reg = registry();
    const rec = recorder([ok({ RunId: "r-9" })]);
    const client = new ApiClient(baseCfg(rec, reg));
    await client.callApi({
      resourcePath: "/GetExecution/2025-07-01/vod/get/text_plain/",
      method: "GET",
      headerParams: { "Content-Type": "text/plain" },
      body: { runId: "r-9" },
      requestType: "FakeReq",
      responseType: "FakeResp",
    });
    const req = rec.requests[0] as HttpRequest;
    expect(req.url).toContain("RunId=r-9");
    expect(req.body).toBe("");
  });

  it("throws ApiException on a business error (ResponseMetadata.Error, status 200)", async () => {
    const reg = registry();
    const rec = recorder([
      { status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: { Error: { Code: "InvalidParameter" } } }) },
    ]);
    const client = new ApiClient(baseCfg(rec, reg));
    await expect(
      client.callApi({ resourcePath: "/X/1/vod/post/x/", method: "POST", headerParams: { "Content-Type": "application/json" }, body: {} }),
    ).rejects.toThrow(/InvalidParameter/);
  });

  it("throws when ResponseMetadata is missing", async () => {
    const reg = registry();
    const rec = recorder([{ status: 200, headers: {}, body: JSON.stringify({ Result: {} }) }]);
    const client = new ApiClient(baseCfg(rec, reg));
    await expect(
      client.callApi({ resourcePath: "/X/1/vod/get/text_plain/", method: "GET", headerParams: { "Content-Type": "text/plain" } }),
    ).rejects.toThrow(/InternalServiceError/);
  });

  it("throws ApiException on non-2xx and does not retry a 400", async () => {
    const reg = registry();
    const rec = recorder([{ status: 400, headers: {}, body: '{"x":1}' }]);
    const client = new ApiClient(baseCfg(rec, reg));
    await expect(
      client.callApi({ resourcePath: "/X/1/vod/get/text_plain/", method: "GET", headerParams: { "Content-Type": "text/plain" } }),
    ).rejects.toBeInstanceOf(ApiException);
    expect(rec.requests.length).toBe(1);
  });

  it("retries a 500 then succeeds, re-signing each attempt", async () => {
    const reg = registry();
    const rec = recorder([{ status: 500, headers: {}, body: "" }, ok({ RunId: "ok" })]);
    let t = Date.UTC(2025, 6, 1, 12, 34, 56);
    const advancing = () => {
      const d = new Date(t);
      t += 1000;
      return d;
    };
    const client = new ApiClient(baseCfg(rec, reg, { clock: advancing }));
    const res = await client.callApi<{ runId: string }>({
      resourcePath: "/StartExecution/2025-07-01/vod/post/application_json/",
      method: "POST",
      headerParams: { "Content-Type": "application/json" },
      body: { runId: "x" },
      requestType: "FakeReq",
      responseType: "FakeResp",
    });
    expect(res).toEqual({ runId: "ok" });
    expect(rec.requests.length).toBe(2);
    expect(rec.requests[0]!.headers["X-Date"]).not.toBe(rec.requests[1]!.headers["X-Date"]);
    // Invocation id is constant across retries; the attempt counter increments (Python parity).
    expect(rec.requests[0]!.headers["X-Sdk-Invocation-Id"]).toBe(rec.requests[1]!.headers["X-Sdk-Invocation-Id"]);
    expect(rec.requests[0]!.headers["X-Sdk-Request"]).toBe("attempt=1; max=4");
    expect(rec.requests[1]!.headers["X-Sdk-Request"]).toBe("attempt=2; max=4");
  });

  it("skips signing when authSettings is empty", async () => {
    const reg = registry();
    const rec = recorder([ok({ RunId: "r" })]);
    const client = new ApiClient(baseCfg(rec, reg));
    await client.callApi({
      resourcePath: "/X/1/vod/get/text_plain/",
      method: "GET",
      headerParams: { "Content-Type": "text/plain" },
      authSettings: [],
    });
    expect(rec.requests[0]!.headers["Authorization"]).toBeUndefined();
  });
});
