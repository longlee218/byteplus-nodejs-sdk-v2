import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLIConfigCredentialProvider,
  DefaultCredentialProvider,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "../src/index.js";

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

const stsOk = (creds: Record<string, unknown>): HttpResponse => ({
  status: 200,
  headers: {},
  body: JSON.stringify({ ResponseMetadata: { RequestId: "x" }, Result: { Credentials: creds } }),
});
const CREDS = { AccessKeyId: "AKtmp", SecretAccessKey: "SKtmp", SessionToken: "ST", ExpiredTime: "2999-01-01T00:00:00Z" };
const clock = (): Date => new Date(Date.parse("2025-07-01T12:00:00Z"));

const ENV_KEYS = [
  "BYTEPLUS_ACCESSKEY",
  "BYTEPLUS_ACCESS_KEY",
  "BYTEPLUS_SECRETKEY",
  "BYTEPLUS_SECRET_KEY",
  "BYTEPLUS_CLI_CONFIG_FILE",
  "BYTEPLUS_PROFILE",
  "BYTEPLUS_ECS_METADATA_DISABLED",
  "BYTEPLUS_ECS_METADATA",
  "BYTEPLUS_OIDC_ROLE_TRN",
  "BYTEPLUS_OIDC_TOKEN_FILE",
];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("CLIConfig non-ak dispatch", () => {
  let dir: string;
  const write = (profile: Record<string, unknown>): string => {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify({ profiles: { default: profile } }));
    return path;
  };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bp-disp-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("ramrolearn -> StsCredentialProvider (signed AssumeRole)", async () => {
    const path = write({
      mode: "ramrolearn",
      "access-key": "AKcli",
      "secret-key": "SKcli",
      "role-name": "clirole",
      "account-id": "acct9",
    });
    const rec = recorder([stsOk(CREDS)]);
    const p = new CLIConfigCredentialProvider({ configPath: path, httpClient: rec.client, clock });
    expect((await p.getCredentials()).ak).toBe("AKtmp");
    const url = decodeURIComponent((rec.requests[0] as HttpRequest).url);
    expect(url).toContain("Action=AssumeRole");
    expect(url).toContain("RoleTrn=trn:iam::acct9:role/clirole");
    expect((rec.requests[0] as HttpRequest).headers["Authorization"]).toMatch(/^HMAC-SHA256 Credential=AKcli\//);
  });

  it("oidc -> StsOidcCredentialProvider (unsigned, token file from config)", async () => {
    const tokenFile = join(dir, "tok");
    writeFileSync(tokenFile, "cli-oidc-token");
    const path = write({ mode: "oidc", "role-trn": "trn:iam::a:role/o", "oidc-token-file": tokenFile });
    const rec = recorder([stsOk(CREDS)]);
    const p = new CLIConfigCredentialProvider({ configPath: path, httpClient: rec.client, clock });
    await p.getCredentials();
    const url = decodeURIComponent((rec.requests[0] as HttpRequest).url);
    expect(url).toContain("Action=AssumeRoleWithOIDC");
    expect(url).toContain("OIDCToken=cli-oidc-token");
    expect((rec.requests[0] as HttpRequest).headers["Authorization"]).toBeUndefined();
  });

  it("ecsrole -> EcsRoleCredentialProvider (IMDS)", async () => {
    const path = write({ mode: "ecsrole", "role-name": "ecsr" });
    const rec = recorder([
      { status: 200, headers: {}, body: "tok" },
      { status: 200, headers: {}, body: JSON.stringify(CREDS) },
    ]);
    const p = new CLIConfigCredentialProvider({ configPath: path, httpClient: rec.client, clock });
    expect((await p.getCredentials()).ak).toBe("AKtmp");
    expect((rec.requests[0] as HttpRequest).method).toBe("PUT");
    expect((rec.requests[1] as HttpRequest).url).toContain("security_credentials/ecsr");
  });

  it("throws for an unknown mode", async () => {
    const path = write({ mode: "quantum" });
    await expect(new CLIConfigCredentialProvider({ configPath: path }).getCredentials()).rejects.toThrow(/quantum/);
  });
});

describe("DefaultCredentialProvider restored chain", () => {
  const names = (p: DefaultCredentialProvider): string[] =>
    (p as unknown as { providers: { constructor: { name: string } }[] }).providers.map((x) => x.constructor.name);

  it("default order is env -> sts-oidc -> cli-config -> ecs", () => {
    const p = new DefaultCredentialProvider();
    expect(names(p)).toEqual([
      "EnvironmentVariableCredentialProvider",
      "StsOidcCredentialProvider",
      "CLIConfigCredentialProvider",
      "EcsRoleCredentialProvider",
    ]);
  });

  it("omits ecs when BYTEPLUS_ECS_METADATA_DISABLED=true", () => {
    process.env["BYTEPLUS_ECS_METADATA_DISABLED"] = "true";
    const p = new DefaultCredentialProvider();
    expect(names(p)).toEqual([
      "EnvironmentVariableCredentialProvider",
      "StsOidcCredentialProvider",
      "CLIConfigCredentialProvider",
    ]);
  });

  it("falls through env -> sts-oidc -> cli-config when only cli-config resolves", async () => {
    const d = mkdtempSync(join(tmpdir(), "bp-chain-"));
    try {
      const path = join(d, "config.json");
      writeFileSync(path, JSON.stringify({ profiles: { default: { mode: "ak", "access-key": "AKc", "secret-key": "SKc" } } }));
      process.env["BYTEPLUS_CLI_CONFIG_FILE"] = path;
      process.env["BYTEPLUS_ECS_METADATA_DISABLED"] = "true"; // keep ecs out of the runtime chain
      const p = new DefaultCredentialProvider();
      const c = await p.getCredentials();
      expect(c.providerName).toBe("CLIConfigCredentialProvider");
      expect(c.ak).toBe("AKc");
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});
