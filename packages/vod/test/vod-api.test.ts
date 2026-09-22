import { describe, it, expect } from "vitest";
import {
  ApiClient,
  Configuration,
  ModelRegistry,
  serializeByType,
  deserializeByType,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "@byteplus-sdk/core";
import {
  VodApi,
  registerVodModels,
  type GetExecutionRequest,
  type StartExecutionResponse,
  type GetExecutionResponse,
} from "../src/index.js";

// --- offline recording client (prior art: core/test/transport.test.ts) ---
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

const FIXED = new Date(Date.UTC(2025, 6, 1, 12, 34, 56));

function freshRegistry(): ModelRegistry {
  const r = new ModelRegistry();
  registerVodModels(r);
  return r;
}

const cfg = (rec: ReturnType<typeof recorder>, registry: ModelRegistry) =>
  new Configuration({
    ak: "AKdummy",
    sk: "SKdummy",
    region: "ap-southeast-1",
    httpClient: rec.client,
    registry,
    clock: () => FIXED,
    sleep: async () => {},
  });

const ok = (result: unknown): HttpResponse => ({
  status: 200,
  headers: {},
  body: JSON.stringify({ ResponseMetadata: { RequestId: "x" }, Result: result }),
});

describe("vod model $meta round-trip", () => {
  it("renames GetExecutionRequest.runId -> RunId on serialize", () => {
    const reg = freshRegistry();
    expect(serializeByType({ runId: "r-3" }, "GetExecutionRequest", reg)).toEqual({ RunId: "r-3" });
  });

  it("renames StartExecutionResponse RunId -> runId on deserialize", () => {
    const reg = freshRegistry();
    expect(deserializeByType({ RunId: "r-1" }, "StartExecutionResponse", reg)).toEqual({ runId: "r-1" });
  });

  it("deserializes the full GetExecutionResponse scalar+container fields", () => {
    const reg = freshRegistry();
    const wire = { Code: "0", RunId: "r-2", Status: "done", Output: { Foo: 1 } };
    expect(deserializeByType(wire, "GetExecutionResponse", reg)).toEqual({
      code: "0",
      runId: "r-2",
      status: "done",
      output: { Foo: 1 }, // nested container passes through verbatim
    });
  });

  it("renames the StartExecutionRequest top-level container keys", () => {
    const reg = freshRegistry();
    expect(serializeByType({ input: { Foo: 1 } }, "StartExecutionRequest", reg)).toEqual({
      Input: { Foo: 1 },
    });
  });
});

describe("VodApi via injected HttpClient", () => {
  it("startExecution: signed POST json to the StartExecution resource path", async () => {
    const rec = recorder([ok({ RunId: "r-1" })]);
    const api = new VodApi(cfg(rec, freshRegistry()));
    const res: StartExecutionResponse = await api.startExecution({ input: { Foo: 1 } });

    const req = rec.requests[0] as HttpRequest;
    expect(req.method).toBe("POST");
    expect(req.url).toBe(
      "https://vod.ap-southeast-1.byteplusapi.com/?Action=StartExecution&Version=2025-07-01",
    );
    expect(req.headers["Authorization"]).toMatch(/^HMAC-SHA256 Credential=AKdummy\//);
    expect(req.headers["Host"]).toBe("vod.ap-southeast-1.byteplusapi.com");
    expect(req.body).toBe('{"Input": {"Foo": 1}}'); // Python json.dumps spacing (parity, US-008)
    expect(res).toEqual({ runId: "r-1" });
    expect(JSON.stringify(req)).not.toContain("SKdummy");
  });

  it("getExecution: signed GET text/plain, runId flattened onto the query", async () => {
    const rec = recorder([ok({ RunId: "r-9", Status: "running" })]);
    const api = new VodApi(cfg(rec, freshRegistry()));
    const res: GetExecutionResponse = await api.getExecution({ runId: "r-9" });

    const req = rec.requests[0] as HttpRequest;
    expect(req.method).toBe("GET");
    expect(req.url).toContain("Action=GetExecution&Version=2025-07-01");
    expect(req.url).toContain("RunId=r-9");
    expect(req.body).toBe("");
    expect(res).toEqual({ runId: "r-9", status: "running" });
  });

  it("accepts an externally constructed ApiClient", async () => {
    const rec = recorder([ok({ RunId: "r-7" })]);
    const client = new ApiClient(cfg(rec, freshRegistry()));
    const api = new VodApi(client);
    const res = await api.startExecution({});
    expect(res).toEqual({ runId: "r-7" });
  });

  it("getExecution throws when the required runId is missing", () => {
    const rec = recorder([ok({})]);
    const api = new VodApi(cfg(rec, freshRegistry()));
    expect(() => api.getExecution({} as GetExecutionRequest)).toThrow(/runId/);
  });
});
