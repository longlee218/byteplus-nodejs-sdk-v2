import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ApiClient,
  Configuration,
  ModelRegistry,
  StsCredentialProvider,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "../src/index.js";
import { startExecutionMetas } from "../../vod/src/models/start-execution-metas.js";

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(resolve(here, "fixtures/request-vectors.json"), "utf8")) as Golden;

interface Golden {
  provenance: { frozen_utc: string; invocationId: string; roleSessionName: string; ak: string; sk: string; region: string };
  cases: Record<string, { input: unknown; expected: { method: string; url: string; query: [string, string][]; headers: Record<string, string>; body: string } }>;
}

const P = golden.provenance;
const FIXED = new Date(Date.UTC(2025, 6, 1, 12, 34, 56));

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

const vodRegistry = (): ModelRegistry => {
  const r = new ModelRegistry();
  r.register("GetExecutionRequest", { attributeMap: { runId: "RunId" }, swaggerTypes: { runId: "str" } });
  r.register("StartExecutionRequest", { attributeMap: { input: "Input" }, swaggerTypes: { input: "InputForStartExecutionInput" } });
  r.register("InputForStartExecutionInput", { attributeMap: { type: "Type", vid: "Vid" }, swaggerTypes: { type: "str", vid: "str" } });
  return r;
};

// Full VOD input tree — the SHIPPED metas from @byteplus-sdk/vod (type-only core
// import erased at runtime), proving the deployed model set renames every nested
// field byte-for-byte, not a test-local approximation.
const vodFullRegistry = (): ModelRegistry => {
  const r = new ModelRegistry();
  for (const [name, meta] of Object.entries(startExecutionMetas)) r.register(name, meta);
  return r;
};

const config = (rec: ReturnType<typeof recorder>, reg: ModelRegistry) =>
  new Configuration({
    ak: P.ak,
    sk: P.sk,
    region: P.region,
    httpClient: rec.client,
    registry: reg,
    clock: () => FIXED,
    invocationId: () => P.invocationId,
    sleep: async () => {},
  });

// Compare Node's signature-bearing output to the Python golden.
function assertParity(req: HttpRequest, expected: Golden["cases"][string]["expected"]) {
  expect(req.headers["X-Date"]).toBe(expected.headers["X-Date"]);
  expect(req.headers["X-Content-Sha256"]).toBe(expected.headers["X-Content-Sha256"]);
  expect(req.headers["Authorization"]).toBe(expected.headers["Authorization"]);
  expect(req.body ?? "").toBe(expected.body);
  // Query compared as a set (order is not signed; Python and Node build it differently).
  const got = new URL(req.url).searchParams;
  const gotMap = Object.fromEntries([...got.entries()]);
  const wantMap = Object.fromEntries(expected.query.map(([k, v]) => [k, String(v)]));
  expect(gotMap).toEqual(wantMap);
  expect(new URL(req.url).host).toBe(new URL(expected.url).host);
}

const stsOk: HttpResponse = {
  status: 200,
  headers: {},
  body: JSON.stringify({
    ResponseMetadata: { RequestId: "x" },
    Result: { Credentials: { AccessKeyId: "AKtmp", SecretAccessKey: "SKtmp", SessionToken: "STStmp", ExpiredTime: "2025-07-01T13:00:00Z" } },
  }),
};

describe("differential parity vs the Python SDK (whole signed request)", () => {
  it("GetExecution (GET text/plain) matches Python byte-for-byte", async () => {
    const rec = recorder([{ status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: {}, Result: {} }) }]);
    await new ApiClient(config(rec, vodRegistry())).callApi({
      resourcePath: "/GetExecution/2025-07-01/vod/get/text_plain/",
      method: "GET",
      headerParams: { "Content-Type": "text/plain", Accept: "application/json" },
      body: { runId: "r-123" },
      requestType: "GetExecutionRequest",
    });
    assertParity(rec.requests[0] as HttpRequest, golden.cases["getExecution"]!.expected);
  });

  it("StartExecution (POST json) matches Python byte-for-byte", async () => {
    const rec = recorder([{ status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: {}, Result: {} }) }]);
    await new ApiClient(config(rec, vodRegistry())).callApi({
      resourcePath: "/StartExecution/2025-07-01/vod/post/application_json/",
      method: "POST",
      headerParams: { "Content-Type": "application/json", Accept: "application/json" },
      body: { input: { type: "vid", vid: "v-123" } },
      requestType: "StartExecutionRequest",
    });
    assertParity(rec.requests[0] as HttpRequest, golden.cases["startExecution"]!.expected);
  });

  it("StartExecution (deeply nested) matches Python byte-for-byte — every depth PascalCase", async () => {
    const rec = recorder([{ status: 200, headers: {}, body: JSON.stringify({ ResponseMetadata: {}, Result: {} }) }]);
    await new ApiClient(config(rec, vodFullRegistry())).callApi({
      resourcePath: "/StartExecution/2025-07-01/vod/post/application_json/",
      method: "POST",
      headerParams: { "Content-Type": "application/json", Accept: "application/json" },
      body: golden.cases["startExecutionNested"]!.input,
      requestType: "StartExecutionRequest",
    });
    const expected = golden.cases["startExecutionNested"]!.expected;
    // The deep rename must land: no camelCase key survives to the wire.
    expect(expected.body).toContain('"Operation": {"Task": {"Enhance": {"Modules"');
    assertParity(rec.requests[0] as HttpRequest, expected);
  });

  it("AssumeRole (STS, signed) matches Python byte-for-byte", async () => {
    const rec = recorder([stsOk]);
    const p = new StsCredentialProvider(P.ak, P.sk, "myrole", "2100000000", {
      httpClient: rec.client,
      clock: () => FIXED,
      invocationId: () => P.invocationId,
      sessionName: P.roleSessionName,
    });
    await p.getCredentials();
    assertParity(rec.requests[0] as HttpRequest, golden.cases["assumeRole"]!.expected);
  });
});
