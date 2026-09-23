// Opt-in live smoke test for @byteplus-sdk/vod-v1.
//
// The live block hits REAL BytePlus VOD (v1) and is skipped unless both
// BYTEPLUS_ACCESSKEY and BYTEPLUS_SECRETKEY are present in the environment, so
// CI stays green with no credentials and never makes a network call. Run it
// manually with real creds:
//
//   BYTEPLUS_ACCESSKEY=... BYTEPLUS_SECRETKEY=... [BYTEPLUS_REGION=ap-singapore-1] \
//     pnpm --filter @byteplus-sdk/vod-v1 exec vitest run test/live.smoke.test.ts
//
// No credentials are ever committed: they are read only from the environment.

import { describe, it, expect } from "vitest";
import { DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodV1 } from "../src/index.js";

/** Live credentials from the environment, or null when they are absent. */
function liveCredentials(): { ak: string; sk: string; region: string } | null {
  const ak = process.env["BYTEPLUS_ACCESSKEY"] ?? process.env["BYTEPLUS_ACCESS_KEY"];
  const sk = process.env["BYTEPLUS_SECRETKEY"] ?? process.env["BYTEPLUS_SECRET_KEY"];
  if (!ak || !sk) return null;
  // v1 hosts: ap-singapore-1 (default) | ap-southeast-1.
  return { ak, sk, region: process.env["BYTEPLUS_REGION"] ?? "ap-singapore-1" };
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

describe.skipIf(live === null)("VOD v1 live smoke (opt-in, real network)", () => {
  it("listSpace authenticates and returns a typed space array", async () => {
    // credentialProvider path (env → CLI → ECS), like a real consumer.
    const vod = new VodV1({ region: live!.region, credentialProvider: new DefaultCredentialProvider() });
    const resp = await vod.space.listSpace({});
    expect(resp.ResponseMetadata).toBeTypeOf("object");
    // BytePlus returns 200 with a business Error.Code on failure; a real 200 has none.
    expect(resp.ResponseMetadata.Error?.Code ?? "").toBe("");
    expect(Array.isArray(resp.Result)).toBe(true);
  });

  it("mints an STS2 upload token from the real credentials", () => {
    // getUploadSts2 needs literal ak/sk (local signing, no network).
    const vod = new VodV1({ ak: live!.ak, sk: live!.sk, region: live!.region });
    const sts = vod.upload.getUploadSts2();
    expect(sts.SessionToken.startsWith("STS2")).toBe(true);
    expect(sts.AccessKeyId.startsWith("AKTP")).toBe(true);
    expect(sts.ExpiredTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
