import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Proves the built package resolves under BOTH module systems.
// Requires `pnpm -r build` to have run first (the root `test` script does this).
const here = dirname(fileURLToPath(import.meta.url));
const distCjs = resolve(here, "../dist/index.js");
const distEsm = resolve(here, "../dist/index.mjs");

describe("@byteplus-sdk/core dual-package resolution", () => {
  it("has both CJS (.js) and ESM (.mjs) build outputs", () => {
    expect(existsSync(distCjs), `missing CJS build: ${distCjs}`).toBe(true);
    expect(existsSync(distEsm), `missing ESM build: ${distEsm}`).toBe(true);
  });

  it("require() resolves the CommonJS entry", () => {
    const require = createRequire(import.meta.url);
    const cjs = require(distCjs) as { CORE_PACKAGE: string };
    expect(cjs.CORE_PACKAGE).toBe("@byteplus-sdk/core");
  });

  it("import() resolves the ESM entry", async () => {
    const esm = (await import(distEsm)) as { CORE_PACKAGE: string };
    expect(esm.CORE_PACKAGE).toBe("@byteplus-sdk/core");
  });
});
