import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { HttpClient } from "../transport/http.js";
import type { CredentialProvider, CredentialValue } from "./types.js";
import { StsCredentialProvider } from "./sts-provider.js";
import { StsOidcCredentialProvider } from "./sts-oidc-provider.js";
import { EcsRoleCredentialProvider } from "./ecs-provider.js";

export interface CliConfigOptions {
  configPath?: string;
  profileName?: string;
  /** Injected into dispatched HTTP providers (STS/OIDC/ECS) for offline proof. */
  httpClient?: HttpClient;
  /** Injected clock forwarded to dispatched providers' expiry/signing. */
  clock?: () => Date;
}

interface CliProfile {
  mode?: string;
  "access-key"?: string;
  "secret-key"?: string;
  "session-token"?: string;
  "role-name"?: string;
  "account-id"?: string;
  "role-trn"?: string;
  "oidc-token-file"?: string;
  policy?: string;
  region?: string;
}

interface CliConfig {
  current?: string;
  profiles?: Record<string, CliProfile>;
}

/**
 * Reads credentials from the byteplus-cli config file, dispatching by profile
 * `mode`: `ak`/empty resolve inline; `ramrolearn`/`oidc`/`ecsrole` delegate to
 * the matching HTTP provider (cached after first init). SSO/console-login stay
 * out of scope. See docs/product/reference-byteplus-python-sdk/auth.md.
 */
export class CLIConfigCredentialProvider implements CredentialProvider {
  private cached?: CredentialValue;
  private delegate?: CredentialProvider;

  constructor(private readonly opts: CliConfigOptions = {}) {}

  private resolveConfigPath(): string {
    return (
      this.opts.configPath ??
      process.env["BYTEPLUS_CLI_CONFIG_FILE"] ??
      join(homedir(), ".byteplus", "config.json")
    );
  }

  private async loadProfile(): Promise<CliProfile> {
    const path = this.resolveConfigPath();
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch {
      throw new Error(`CLIConfigCredentialProvider: cannot read config file at ${path}`);
    }
    let config: CliConfig;
    try {
      config = JSON.parse(raw) as CliConfig;
    } catch {
      throw new Error(`CLIConfigCredentialProvider: config file at ${path} is not valid JSON`);
    }
    const name = this.opts.profileName ?? process.env["BYTEPLUS_PROFILE"] ?? config.current ?? "default";
    const profile = config.profiles?.[name];
    if (!profile) {
      throw new Error(`CLIConfigCredentialProvider: profile "${name}" not found in ${path}`);
    }
    return profile;
  }

  private buildDelegate(profile: CliProfile): CredentialProvider {
    const mode = (profile.mode ?? "").toLowerCase().trim();
    const { httpClient, clock } = this.opts;
    if (mode === "ramrolearn") {
      const ak = profile["access-key"]?.trim();
      const sk = profile["secret-key"]?.trim();
      const roleName = profile["role-name"]?.trim();
      const accountId = profile["account-id"]?.trim();
      if (!ak || !sk || !roleName || !accountId) {
        throw new Error('CLIConfigCredentialProvider: ramrolearn needs access-key/secret-key/role-name/account-id');
      }
      return new StsCredentialProvider(ak, sk, roleName, accountId, { region: profile.region, httpClient, clock });
    }
    if (mode === "oidc") {
      const roleTrn = profile["role-trn"]?.trim();
      const tokenFile = profile["oidc-token-file"]?.trim();
      if (!roleTrn || !tokenFile) {
        throw new Error("CLIConfigCredentialProvider: oidc needs role-trn/oidc-token-file");
      }
      return new StsOidcCredentialProvider({ roleTrn, tokenFile, policy: profile.policy, region: profile.region, httpClient, clock });
    }
    if (mode === "ecsrole") {
      return new EcsRoleCredentialProvider({ roleName: profile["role-name"]?.trim(), httpClient, clock });
    }
    throw new Error(`CLIConfigCredentialProvider: unsupported profile mode "${mode}"`);
  }

  async getCredentials(): Promise<CredentialValue> {
    if (this.delegate) return this.delegate.getCredentials();
    if (this.cached) return { ...this.cached };
    const profile = await this.loadProfile();
    const mode = (profile.mode ?? "").toLowerCase().trim();
    if (mode !== "ak" && mode !== "") {
      this.delegate = this.buildDelegate(profile);
      return this.delegate.getCredentials();
    }
    const ak = profile["access-key"]?.trim();
    const sk = profile["secret-key"]?.trim();
    if (!ak || !sk) {
      throw new Error('CLIConfigCredentialProvider: profile is missing "access-key" or "secret-key"');
    }
    this.cached = {
      ak,
      sk,
      sessionToken: profile["session-token"]?.trim() || undefined,
      providerName: "CLIConfigCredentialProvider",
    };
    return { ...this.cached };
  }

  async retrieve(): Promise<CredentialValue> {
    if (this.delegate) return this.delegate.retrieve();
    return this.getCredentials();
  }

  isExpired(): boolean {
    if (this.delegate) return this.delegate.isExpired();
    return this.cached === undefined;
  }

  async refresh(): Promise<void> {
    if (this.delegate) return this.delegate.refresh();
    this.cached = undefined;
    await this.getCredentials();
  }
}
