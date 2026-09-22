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

describe("StsCredentialProvider (AssumeRole, signed)", () => {
  it("sends a signed AssumeRole with RoleTrn/DurationSeconds and parses Credentials", async () => {
    const rec = recorder([stsOk(CREDS)]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new StsCredentialProvider("AKcaller", "SKcaller", "myrole", "2100000000", {
      httpClient: rec.client,
      clock,
      sessionName: "fixedsession",
    });
    const c = await p.getCredentials();
    expect(c).toMatchObject({ ak: "AKtmp", sk: "SKtmp", sessionToken: "STStmp", providerName: "StsCredentialProvider" });

    const req = rec.requests[0] as HttpRequest;
    expect(req.url).toContain("Action=AssumeRole");
    expect(req.url).toContain("Version=2018-01-01");
    expect(req.url).toContain("DurationSeconds=3600");
    expect(decodeURIComponent(req.url)).toContain("RoleTrn=trn:iam::2100000000:role/myrole");
    expect(decodeURIComponent(req.url)).toContain("RoleSessionName=fixedsession");
    expect(req.headers["Authorization"]).toMatch(/^HMAC-SHA256 Credential=AKcaller\//);
  });

  it("serves cached credentials until the expiry buffer, then refreshes", async () => {
    const rec = recorder([stsOk(CREDS), stsOk({ ...CREDS, AccessKeyId: "AKtmp2", ExpiredTime: "2025-07-01T15:00:00Z" })]);
    const fc = fakeClock("2025-07-01T12:00:00Z"); // expires 13:00, buffer 60s
    const p = new StsCredentialProvider("AKcaller", "SKcaller", "r", "acct", { httpClient: rec.client, clock: fc.clock });
    expect((await p.getCredentials()).ak).toBe("AKtmp");
    fc.advanceSeconds(30 * 60); // 12:30 — still valid
    expect((await p.getCredentials()).ak).toBe("AKtmp");
    expect(rec.requests.length).toBe(1);
    fc.advanceSeconds(30 * 60); // 13:00 — within buffer of expiry -> refresh
    expect((await p.getCredentials()).ak).toBe("AKtmp2");
    expect(rec.requests.length).toBe(2);
  });

  it("rejects a buffer above 600 seconds", () => {
    expect(() => new StsCredentialProvider("a", "b", "r", "acct", { bufferSeconds: 601 })).toThrow(/600/);
  });

  it("dedupes concurrent refreshes into a single STS call (single-flight)", async () => {
    const rec = recorder([stsOk(CREDS)]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new StsCredentialProvider("a", "b", "r", "acct", { httpClient: rec.client, clock });
    await Promise.all([p.getCredentials(), p.getCredentials(), p.getCredentials()]);
    expect(rec.requests.length).toBe(1);
  });
});

describe("StsOidcCredentialProvider (AssumeRoleWithOIDC, unsigned)", () => {
  let dir: string;
  let tokenFile: string;
  const OIDC_KEYS = [
    "BYTEPLUS_OIDC_ROLE_TRN",
    "BYTEPLUS_OIDC_TOKEN_FILE",
    "BYTEPLUS_OIDC_ROLE_SESSION_NAME",
    "BYTEPLUS_OIDC_ROLE_POLICY",
    "BYTEPLUS_OIDC_STS_ENDPOINT",
  ];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bp-oidc-"));
    tokenFile = join(dir, "token");
    writeFileSync(tokenFile, "the-oidc-token\n");
    saved = {};
    for (const k of OIDC_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    for (const k of OIDC_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("resolves env, reads the token file, and sends an UNSIGNED AssumeRoleWithOIDC", async () => {
    process.env["BYTEPLUS_OIDC_ROLE_TRN"] = "trn:iam::acct:role/oidc";
    process.env["BYTEPLUS_OIDC_TOKEN_FILE"] = tokenFile;
    process.env["BYTEPLUS_OIDC_ROLE_SESSION_NAME"] = "sess";
    const rec = recorder([stsOk(CREDS)]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new StsOidcCredentialProvider({ httpClient: rec.client, clock });
    const c = await p.getCredentials();
    expect(c.ak).toBe("AKtmp");

    const req = rec.requests[0] as HttpRequest;
    expect(req.url).toContain("Action=AssumeRoleWithOIDC");
    expect(decodeURIComponent(req.url)).toContain("OIDCToken=the-oidc-token");
    expect(req.headers["Authorization"]).toBeUndefined();
  });

  it("accepts the Expiration field as an alias for ExpiredTime", async () => {
    process.env["BYTEPLUS_OIDC_ROLE_TRN"] = "trn:iam::acct:role/oidc";
    process.env["BYTEPLUS_OIDC_TOKEN_FILE"] = tokenFile;
    const rec = recorder([stsOk({ AccessKeyId: "AKe", SecretAccessKey: "SKe", Expiration: "2025-07-01T13:00:00Z" })]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new StsOidcCredentialProvider({ httpClient: rec.client, clock });
    expect((await p.getCredentials()).ak).toBe("AKe");
  });

  it("uses explicit opts over env (cli-config dispatch shape)", async () => {
    const rec = recorder([stsOk(CREDS)]);
    const { clock } = fakeClock("2025-07-01T12:00:00Z");
    const p = new StsOidcCredentialProvider({ roleTrn: "trn:iam::x:role/y", tokenFile, httpClient: rec.client, clock });
    await p.getCredentials();
    expect(decodeURIComponent((rec.requests[0] as HttpRequest).url)).toContain("RoleTrn=trn:iam::x:role/y");
  });

  it("throws when the token file is missing", async () => {
    process.env["BYTEPLUS_OIDC_ROLE_TRN"] = "trn:iam::acct:role/oidc";
    process.env["BYTEPLUS_OIDC_TOKEN_FILE"] = join(dir, "absent");
    const p = new StsOidcCredentialProvider({ httpClient: recorder([stsOk(CREDS)]).client });
    await expect(p.getCredentials()).rejects.toThrow(/token file/i);
  });

  it("throws when the role TRN is not configured", async () => {
    process.env["BYTEPLUS_OIDC_TOKEN_FILE"] = tokenFile;
    const p = new StsOidcCredentialProvider({ httpClient: recorder([stsOk(CREDS)]).client });
    await expect(p.getCredentials()).rejects.toThrow(/ROLE_TRN/);
  });
});
