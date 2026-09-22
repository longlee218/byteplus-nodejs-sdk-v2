import { describe, it, expect } from "vitest";
import {
  Configuration,
  ModelRegistry,
  parseResourcePath,
  reqToParams,
  resolveEndpoint,
  backoffDelayMs,
  serializeByType,
} from "../src/index.js";

describe("build helpers", () => {
  it("parses the resource_path descriptor", () => {
    expect(parseResourcePath("/StartExecution/2025-07-01/vod/post/application_json/")).toEqual({
      action: "StartExecution",
      version: "2025-07-01",
      service: "vod",
    });
  });

  it("flattens nested objects into dotted 1-based query keys with lowercased bools", () => {
    expect(reqToParams({ A: 1, B: [{ x: true }, { x: false }], C: { d: "e" } })).toEqual({
      A: "1",
      "B.1.x": "true",
      "B.2.x": "false",
      "C.d": "e",
    });
  });

  it("serializes a model via attributeMap (drops undefined)", () => {
    const r = new ModelRegistry();
    r.register("FakeReq", { attributeMap: { runId: "RunId" }, swaggerTypes: { runId: "str" } });
    expect(serializeByType({ runId: "r-1", extra: undefined }, "FakeReq", r)).toEqual({ RunId: "r-1" });
  });
});

describe("resolveEndpoint", () => {
  it("uses region by default", () => {
    expect(resolveEndpoint("vod", new Configuration({ region: "ap-southeast-1" })).host).toBe(
      "vod.ap-southeast-1.byteplusapi.com",
    );
  });
  it("honors a host override", () => {
    expect(resolveEndpoint("vod", new Configuration({ host: "open.example.com" })).prefix).toBe(
      "https://open.example.com",
    );
  });
  it("uses the dualstack suffix when enabled", () => {
    expect(resolveEndpoint("vod", new Configuration({ useDualStack: true })).host).toBe(
      "vod.ap-southeast-1.byteplus-api.com",
    );
  });
});

describe("Configuration defaults", () => {
  it("applies BytePlus defaults", () => {
    const c = new Configuration();
    expect(c.region).toBe("ap-southeast-1");
    expect(c.scheme).toBe("https");
    expect(c.maxRetries).toBe(3);
    expect(c.connectTimeoutMs).toBe(30000);
  });
});

describe("backoffDelayMs", () => {
  it("stays within [base, 2*base] and is capped", () => {
    for (let n = 0; n < 4; n++) {
      const base = 300 * 2 ** n;
      const d = backoffDelayMs(n);
      expect(d).toBeGreaterThanOrEqual(base);
      expect(d).toBeLessThanOrEqual(Math.min(300000, 2 * base));
    }
  });
});
