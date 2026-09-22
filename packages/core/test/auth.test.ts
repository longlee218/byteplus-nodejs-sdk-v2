import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  StaticCredentialProvider,
  EnvironmentVariableCredentialProvider,
  CLIConfigCredentialProvider,
  DefaultCredentialProvider,
  type CredentialProvider,
} from "../src/index.js";

const ENV_KEYS = [
  "BYTEPLUS_ACCESSKEY",
  "BYTEPLUS_ACCESS_KEY",
  "BYTEPLUS_SECRETKEY",
  "BYTEPLUS_SECRET_KEY",
  "BYTEPLUS_SESSION_TOKEN",
  "BYTEPLUS_CLI_CONFIG_FILE",
  "BYTEPLUS_PROFILE",
];

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("StaticCredentialProvider", () => {
  it("returns the supplied credentials and never expires", async () => {
    const p = new StaticCredentialProvider("AKdummy", "SKdummy", "tok");
    expect(await p.getCredentials()).toEqual({
      ak: "AKdummy",
      sk: "SKdummy",
      sessionToken: "tok",
      providerName: "StaticCredentialProvider",
    });
    expect(p.isExpired()).toBe(false);
  });
});

describe("EnvironmentVariableCredentialProvider", () => {
  const p = new EnvironmentVariableCredentialProvider();

  it("reads BYTEPLUS_ACCESSKEY / BYTEPLUS_SECRETKEY", async () => {
    process.env["BYTEPLUS_ACCESSKEY"] = "AK1";
    process.env["BYTEPLUS_SECRETKEY"] = "SK1";
    expect(await p.getCredentials()).toMatchObject({ ak: "AK1", sk: "SK1", sessionToken: undefined });
  });

  it("reads the *_ACCESS_KEY / *_SECRET_KEY aliases and session token", async () => {
    process.env["BYTEPLUS_ACCESS_KEY"] = "AK2";
    process.env["BYTEPLUS_SECRET_KEY"] = "SK2";
    process.env["BYTEPLUS_SESSION_TOKEN"] = "tok2";
    expect(await p.getCredentials()).toMatchObject({ ak: "AK2", sk: "SK2", sessionToken: "tok2" });
  });

  it("throws when AK is missing", async () => {
    process.env["BYTEPLUS_SECRETKEY"] = "SK1";
    await expect(p.getCredentials()).rejects.toThrow(/BYTEPLUS_ACCESSKEY/);
  });

  it("throws when SK is missing", async () => {
    process.env["BYTEPLUS_ACCESSKEY"] = "AK1";
    await expect(p.getCredentials()).rejects.toThrow(/BYTEPLUS_SECRETKEY/);
  });

  it("re-reads the environment on each call (no caching)", async () => {
    process.env["BYTEPLUS_ACCESSKEY"] = "AK1";
    process.env["BYTEPLUS_SECRETKEY"] = "SK1";
    expect((await p.getCredentials()).ak).toBe("AK1");
    process.env["BYTEPLUS_ACCESSKEY"] = "AKchanged";
    expect((await p.getCredentials()).ak).toBe("AKchanged");
  });
});

describe("CLIConfigCredentialProvider", () => {
  let dir: string;
  const write = (cfg: unknown): string => {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify(cfg));
    return path;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bp-cli-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const akProfile = { mode: "ak", "access-key": "AKcli", "secret-key": "SKcli", "session-token": "tokcli" };

  it("reads ak-mode keys from the resolved profile", async () => {
    const path = write({ current: "default", profiles: { default: akProfile } });
    const p = new CLIConfigCredentialProvider({ configPath: path });
    expect(await p.getCredentials()).toMatchObject({ ak: "AKcli", sk: "SKcli", sessionToken: "tokcli" });
  });

  it("honors BYTEPLUS_CLI_CONFIG_FILE and BYTEPLUS_PROFILE", async () => {
    const path = write({ profiles: { alt: { ...akProfile, "access-key": "AKalt" } } });
    process.env["BYTEPLUS_CLI_CONFIG_FILE"] = path;
    process.env["BYTEPLUS_PROFILE"] = "alt";
    const p = new CLIConfigCredentialProvider();
    expect((await p.getCredentials()).ak).toBe("AKalt");
  });

  it("prefers config.current then falls back to 'default'", async () => {
    const path = write({ current: "prod", profiles: { prod: { ...akProfile, "access-key": "AKprod" } } });
    expect((await new CLIConfigCredentialProvider({ configPath: path }).getCredentials()).ak).toBe("AKprod");
  });

  it("dispatches non-ak modes (validating required keys)", async () => {
    // ramrolearn now dispatches to StsCredentialProvider; missing role-name/account-id
    // surfaces a dispatch validation error, not the old "requires US-007" stub.
    const path = write({ profiles: { default: { mode: "ramrolearn", "access-key": "a", "secret-key": "b" } } });
    await expect(new CLIConfigCredentialProvider({ configPath: path }).getCredentials()).rejects.toThrow(/role-name/);
  });

  it("throws when the file is missing", async () => {
    await expect(
      new CLIConfigCredentialProvider({ configPath: join(dir, "nope.json") }).getCredentials(),
    ).rejects.toThrow(/cannot read config file/);
  });

  it("throws when the profile is absent", async () => {
    const path = write({ current: "ghost", profiles: {} });
    await expect(new CLIConfigCredentialProvider({ configPath: path }).getCredentials()).rejects.toThrow(/not found/);
  });

  it("throws when keys are missing", async () => {
    const path = write({ profiles: { default: { mode: "ak" } } });
    await expect(new CLIConfigCredentialProvider({ configPath: path }).getCredentials()).rejects.toThrow(/access-key/);
  });
});
