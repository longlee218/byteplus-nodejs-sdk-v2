import { describe, it, expect } from "vitest";
import { VOD_PACKAGE, coreDependency } from "../src/index.js";

describe("@byteplus-sdk/vod", () => {
  it("exposes its package identity", () => {
    expect(VOD_PACKAGE).toBe("@byteplus-sdk/vod");
  });

  it("resolves its cross-package dependency on @byteplus-sdk/core", () => {
    expect(coreDependency()).toBe("@byteplus-sdk/core");
  });
});
