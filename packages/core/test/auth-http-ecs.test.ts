import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  StsCredentialProvider,
  StsOidcCredentialProvider,
  StsSamlCredentialProvider,
  EcsRoleCredentialProvider,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "../src/index.js";

// A recording HTTP client: captures requests, replays canned responses in order.
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

// Canned STS success wrapping Credentials in the ResponseMetadata/Result envelope.
const stsOk = (creds: Record<string, unknown>): HttpResponse => ({
  status: 200,
  headers: {},
  body: JSON.stringify({ ResponseMetadata: { RequestId: "x" }, Result: { Credentials: creds } }),
});

const CREDS = {
  AccessKeyId: "AKtmp",
  SecretAccessKey: "SKtmp",
  SessionToken: "STStmp",
  ExpiredTime: "2025-07-01T13:00:00Z",
};

// Mutable clock: tests advance `now` to drive expiry/refresh deterministically.
function fakeClock(startIso: string) {
  const state = { ms: Date.parse(startIso) };
  return { clock: (): Date => new Date(state.ms), advanceSeconds: (s: number) => (state.ms += s * 1000) };
}

describe("StsSamlCredentialProvider (AssumeRoleWithSAML, unsigned)", () => {
  it("sends SAMLProviderTrn and SAMLResp params, unsigned", async () => {
    const rec = recorder([stsOk(CREDS)]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new StsSamlCredentialProvider("samlrole", "acct", "myidp", "base64resp", { httpClient: rec.client, clock });
    await p.getCredentials();
    const url = decodeURIComponent((rec.requests[0] as HttpRequest).url);
    expect(url).toContain("Action=AssumeRoleWithSAML");
    expect(url).toContain("SAMLProviderTrn=trn:iam::acct:saml-provider/myidp");
    expect(url).toContain("RoleTrn=trn:iam::acct:role/samlrole");
    expect(url).toContain("SAMLResp=base64resp");
    expect((rec.requests[0] as HttpRequest).headers["Authorization"]).toBeUndefined();
  });
});

describe("EcsRoleCredentialProvider (IMDS)", () => {
  const tokenResp: HttpResponse = { status: 200, headers: {}, body: "imds-token" };
  const roleListResp: HttpResponse = { status: 200, headers: {}, body: JSON.stringify({ roles: ["auto-role"] }) };
  const credsResp: HttpResponse = { status: 200, headers: {}, body: JSON.stringify(CREDS) };
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env["BYTEPLUS_ECS_METADATA_DISABLED"];
    delete process.env["BYTEPLUS_ECS_METADATA_DISABLED"];
    delete process.env["BYTEPLUS_ECS_METADATA"];
  });
  afterEach(() => {
    if (saved === undefined) delete process.env["BYTEPLUS_ECS_METADATA_DISABLED"];
    else process.env["BYTEPLUS_ECS_METADATA_DISABLED"] = saved;
  });

  it("runs token -> auto-detect role -> creds with the IMDS headers", async () => {
    const rec = recorder([tokenResp, roleListResp, credsResp]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new EcsRoleCredentialProvider({ httpClient: rec.client, clock });
    const c = await p.getCredentials();
    expect(c).toMatchObject({ ak: "AKtmp", sk: "SKtmp", sessionToken: "STStmp" });

    expect(rec.requests[0]).toMatchObject({ method: "PUT" });
    expect((rec.requests[0] as HttpRequest).url).toContain("/latest/api/token");
    expect((rec.requests[0] as HttpRequest).headers["X-volc-ecs-metadata-token-ttl-seconds"]).toBe("21600");
    expect((rec.requests[1] as HttpRequest).url).toContain("security_credentials?type=user&format=json");
    expect((rec.requests[1] as HttpRequest).headers["X-volc-ecs-metadata-token"]).toBe("imds-token");
    expect((rec.requests[2] as HttpRequest).url).toContain("security_credentials/auto-role");
  });

  it("skips role auto-detection when a role name is supplied", async () => {
    const rec = recorder([tokenResp, credsResp]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new EcsRoleCredentialProvider({ roleName: "explicit", httpClient: rec.client, clock });
    await p.getCredentials();
    expect(rec.requests.length).toBe(2);
    expect((rec.requests[1] as HttpRequest).url).toContain("security_credentials/explicit");
  });

  it("throws at construction when disabled by env", () => {
    process.env["BYTEPLUS_ECS_METADATA_DISABLED"] = "true";
    expect(() => new EcsRoleCredentialProvider()).toThrow(/disabled/i);
  });
});

describe("no provider logs secrets", () => {
  it("STS getCredentials emits no console output", async () => {
    const spies = ["log", "info", "warn", "error", "debug"].map((m) =>
      vi.spyOn(console, m as "log").mockImplementation(() => {}),
    );
    try {
      const rec = recorder([stsOk(CREDS)]);
      const { clock } = fakeClock("2025-07-01T12:00:00Z");
      await new StsCredentialProvider("AKcaller", "SKcaller", "r", "acct", { httpClient: rec.client, clock }).getCredentials();
      for (const s of spies) expect(s).not.toHaveBeenCalled();
    } finally {
      for (const s of spies) s.mockRestore();
    }
  });
});
