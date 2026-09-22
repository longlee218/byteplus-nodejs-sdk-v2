import { describe, it, expect } from "vitest";
import { CORE_PACKAGE, version } from "../src/index.js";

describe("@byteplus-sdk/core", () => {
  it("exposes its package identity", () => {
    expect(CORE_PACKAGE).toBe("@byteplus-sdk/core");
  });

  it("exposes a version string", () => {
    expect(typeof version).toBe("string");
  });
});
