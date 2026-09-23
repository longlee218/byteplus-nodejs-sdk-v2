import { describe, it, expect } from "vitest";
import { resolveV1Host, V1_HOSTS, VOD_V1_DEFAULT_REGION } from "../src/index.js";

describe("v1 service config", () => {
  it("resolves the two known regions to their hosts", () => {
    expect(resolveV1Host("ap-singapore-1")).toBe("vod.byteplusapi.com");
    expect(resolveV1Host("ap-southeast-1")).toBe("vod.ap-southeast-1.byteplusapi.com");
  });

  it("defaults to ap-singapore-1", () => {
    expect(VOD_V1_DEFAULT_REGION).toBe("ap-singapore-1");
    expect(V1_HOSTS[VOD_V1_DEFAULT_REGION]).toBe("vod.byteplusapi.com");
  });

  it("throws on an unknown region", () => {
    expect(() => resolveV1Host("us-east-1")).toThrow(/unknown region/);
  });
});
