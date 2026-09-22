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

describe("DefaultCredentialProvider", () => {
  const ok = (name: string): CredentialProvider => ({
    getCredentials: async () => ({ ak: name, sk: "sk", providerName: name }),
    retrieve: async () => ({ ak: name, sk: "sk", providerName: name }),
    isExpired: () => false,
    refresh: async () => {},
  });
  const fail = (msg: string): CredentialProvider => ({
    getCredentials: async () => {
      throw new Error(msg);
    },
    retrieve: async () => {
      throw new Error(msg);
    },
    isExpired: () => true,
    refresh: async () => {},
  });

  it("returns the first provider that succeeds", async () => {
    const p = new DefaultCredentialProvider({ providers: [fail("no env"), ok("cli")] });
    expect((await p.getCredentials()).providerName).toBe("cli");
  });

  it("caches the last successful provider", async () => {
    let calls = 0;
    const counting: CredentialProvider = {
      getCredentials: async () => {
        calls += 1;
        return { ak: "a", sk: "b", providerName: "counting" };
      },
      retrieve: async () => ({ ak: "a", sk: "b" }),
      isExpired: () => false,
      refresh: async () => {},
    };
    const p = new DefaultCredentialProvider({ providers: [fail("x"), counting] });
    await p.getCredentials();
    await p.getCredentials();
    expect(calls).toBe(2); // resolved via cached provider both times, not re-scanning the chain
  });

  it("throws listing every provider failure when none resolve", async () => {
    const p = new DefaultCredentialProvider({ providers: [fail("no env"), fail("no cli")] });
    await expect(p.getCredentials()).rejects.toThrow(/no env[\s\S]*no cli/);
  });

  it("uses env -> cli-config by default (env wins when set)", async () => {
    process.env["BYTEPLUS_ACCESSKEY"] = "AKenv";
    process.env["BYTEPLUS_SECRETKEY"] = "SKenv";
    const p = new DefaultCredentialProvider();
    expect((await p.getCredentials()).providerName).toBe("EnvironmentVariableCredentialProvider");
  });

  it("real default chain falls through to cli-config when env is absent", async () => {
    const d = mkdtempSync(join(tmpdir(), "bp-cli-"));
    try {
      const path = join(d, "config.json");
      writeFileSync(path, JSON.stringify({ profiles: { default: { mode: "ak", "access-key": "AKc", "secret-key": "SKc" } } }));
      process.env["BYTEPLUS_CLI_CONFIG_FILE"] = path; // env creds NOT set -> Env fails, CLIConfig resolves
      const p = new DefaultCredentialProvider();
      const c = await p.getCredentials();
      expect(c.providerName).toBe("CLIConfigCredentialProvider");
      expect(c.ak).toBe("AKc");
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("refresh() drops the cached provider and re-resolves", async () => {
    process.env["BYTEPLUS_ACCESSKEY"] = "AKenv";
    process.env["BYTEPLUS_SECRETKEY"] = "SKenv";
    const p = new DefaultCredentialProvider();
    await p.getCredentials();
    expect(p.isExpired()).toBe(false);
    await p.refresh();
    expect((await p.getCredentials()).providerName).toBe("EnvironmentVariableCredentialProvider");
  });
});

describe("provider retrieve() / isExpired() / refresh() semantics", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bp-cli-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const writeCfg = (ak: string): string => {
    const path = join(dir, "config.json");
    writeFileSync(path, JSON.stringify({ profiles: { default: { mode: "ak", "access-key": ak, "secret-key": "SK" } } }));
    return path;
  };

  it("Static.retrieve returns a copy (caller cannot corrupt cache)", async () => {
    const p = new StaticCredentialProvider("AK", "SK");
    const a = await p.retrieve();
    a.ak = "MUTATED";
    expect((await p.retrieve()).ak).toBe("AK");
  });

  it("CLIConfig: honors the profileName arg over config.current", async () => {
    const path = join(dir, "config.json");
    writeFileSync(
      path,
      JSON.stringify({ current: "prod", profiles: { prod: { mode: "ak", "access-key": "AKprod", "secret-key": "S" }, dev: { mode: "ak", "access-key": "AKdev", "secret-key": "S" } } }),
    );
    const p = new CLIConfigCredentialProvider({ configPath: path, profileName: "dev" });
    expect((await p.getCredentials()).ak).toBe("AKdev");
  });

  it("CLIConfig: isExpired flips false after first resolve", async () => {
    const p = new CLIConfigCredentialProvider({ configPath: writeCfg("AK1") });
    expect(p.isExpired()).toBe(true);
    await p.getCredentials();
    expect(p.isExpired()).toBe(false);
  });

  it("CLIConfig: refresh() clears cache and re-reads the file", async () => {
    const path = writeCfg("AKold");
    const p = new CLIConfigCredentialProvider({ configPath: path });
    expect((await p.getCredentials()).ak).toBe("AKold");
    writeFileSync(path, JSON.stringify({ profiles: { default: { mode: "ak", "access-key": "AKnew", "secret-key": "SK" } } }));
    expect((await p.getCredentials()).ak).toBe("AKold"); // still cached
    await p.refresh();
    expect((await p.getCredentials()).ak).toBe("AKnew");
  });
});
