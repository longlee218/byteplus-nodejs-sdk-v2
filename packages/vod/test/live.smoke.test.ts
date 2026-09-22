// Opt-in live smoke test for @byteplus-sdk/vod.
//
// The live block hits REAL BytePlus VOD and is skipped unless both
// BYTEPLUS_ACCESSKEY and BYTEPLUS_SECRETKEY are present in the environment, so
// CI stays green with no credentials and never makes a network call. Run it
// manually with real creds:
//
//   BYTEPLUS_ACCESSKEY=... BYTEPLUS_SECRETKEY=... [BYTEPLUS_REGION=...] \
//     pnpm --filter @byteplus-sdk/vod exec vitest run test/live.smoke.test.ts
//
// No credentials are ever committed: they are read only from the environment.

import { describe, it, expect } from "vitest";
import { Configuration, DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodApi } from "../src/index.js";

/** Live credentials from the environment, or null when they are absent. */
function liveCredentials(): { region: string } | null {
  const ak = process.env["BYTEPLUS_ACCESSKEY"] ?? process.env["BYTEPLUS_ACCESS_KEY"];
  const sk = process.env["BYTEPLUS_SECRETKEY"] ?? process.env["BYTEPLUS_SECRET_KEY"];
  if (!ak || !sk) return null;
  return { region: process.env["BYTEPLUS_REGION"] ?? "ap-southeast-1" };
}

const live = liveCredentials();

// Runs in CI (no network): proves the guard skips the live block when creds are
// absent, and enables it exactly when both keys are present.
describe("live smoke guard", () => {
  it("enables the live block only when both access and secret keys are set", () => {
    const hasCreds = Boolean(
      (process.env["BYTEPLUS_ACCESSKEY"] ?? process.env["BYTEPLUS_ACCESS_KEY"]) &&
        (process.env["BYTEPLUS_SECRETKEY"] ?? process.env["BYTEPLUS_SECRET_KEY"]),
    );
    expect(live !== null).toBe(hasCreds);
  });
});

describe.skipIf(live === null)("VOD live smoke (opt-in, real network)", () => {
  it("StartExecution then GetExecution return typed responses", async () => {
    const config = new Configuration({
      region: live!.region,
      credentialProvider: new DefaultCredentialProvider(),
    });
    const api = new VodApi(config);

    const started = await api.startExecution({});
    expect(started).toBeTypeOf("object");

    if (started.runId) {
      const got = await api.getExecution({ runId: started.runId });
      expect(got).toBeTypeOf("object");
    }
  });
});
