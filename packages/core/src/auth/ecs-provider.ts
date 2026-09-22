import type { HttpClient } from "../transport/http.js";
import { fetchHttpClient } from "../transport/http.js";
import { RefreshableCredentialProvider, expiryFromString, type FetchedCredential } from "./refreshable-provider.js";
import type { CredentialValue } from "./types.js";

const DEFAULT_BUFFER_SECONDS = 300;
const DEFAULT_IMDS_BASE = "http://100.96.0.96";
const TOKEN_PATH = "/latest/api/token";
const TOKEN_TTL_SECONDS = "21600";
const ROLE_PATH = "/volcstack/latest/iam/security_credentials";

export interface EcsProviderOptions {
  /** Role name; falls back to env `BYTEPLUS_ECS_METADATA`, then auto-detect. */
  roleName?: string;
  httpClient?: HttpClient;
  /** IMDS base URL override (default `http://100.96.0.96`). */
  endpoint?: string;
  clock?: () => Date;
  bufferSeconds?: number;
}

interface EcsCredentialsShape {
  AccessKeyId?: string;
  SecretAccessKey?: string;
  SessionToken?: string;
  ExpiredTime?: string;
}

/**
 * ECS instance-role credentials via the IMDS metadata service (unsigned; NOT the
 * signed transport). Flow: PUT token -> resolve role -> GET credentials. Killed
 * by `BYTEPLUS_ECS_METADATA_DISABLED=true`. See
 * docs/product/reference-byteplus-python-sdk/auth.md.
 */
export class EcsRoleCredentialProvider extends RefreshableCredentialProvider {
  private readonly http: HttpClient;
  private readonly base: string;

  constructor(private readonly opts: EcsProviderOptions = {}) {
    super(opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS, opts.clock);
    if (process.env["BYTEPLUS_ECS_METADATA_DISABLED"] === "true") {
      throw new Error("EcsRoleCredentialProvider: disabled via BYTEPLUS_ECS_METADATA_DISABLED=true");
    }
    this.http = opts.httpClient ?? fetchHttpClient;
    this.base = opts.endpoint ?? DEFAULT_IMDS_BASE;
  }

  protected async fetch(): Promise<FetchedCredential> {
    const token = await this.fetchToken();
    const role = await this.resolveRole(token);
    const creds = await this.fetchCredentials(token, role);
    if (!creds.AccessKeyId || !creds.SecretAccessKey || !creds.ExpiredTime) {
      throw new Error("EcsRoleCredentialProvider: IMDS credentials response was incomplete");
    }
    const value: CredentialValue = {
      ak: creds.AccessKeyId,
      sk: creds.SecretAccessKey,
      sessionToken: creds.SessionToken,
      providerName: "EcsRoleCredentialProvider",
    };
    return { value, expiredAtMs: expiryFromString(creds.ExpiredTime) };
  }

  private async fetchToken(): Promise<string> {
    const res = await this.http({
      method: "PUT",
      url: this.base + TOKEN_PATH,
      headers: { "X-volc-ecs-metadata-token-ttl-seconds": TOKEN_TTL_SECONDS },
    });
    if (res.status < 200 || res.status > 299) {
      throw new Error(`EcsRoleCredentialProvider: IMDS token request failed with HTTP ${res.status}`);
    }
    return res.body.trim();
  }

  private async resolveRole(token: string): Promise<string> {
    const explicit = this.opts.roleName ?? process.env["BYTEPLUS_ECS_METADATA"];
    if (explicit) return explicit;
    const res = await this.imdsGet(`${ROLE_PATH}?type=user&format=json`, token);
    const parsed = JSON.parse(res) as { roles?: string[] };
    const role = parsed.roles?.[0];
    if (!role) throw new Error("EcsRoleCredentialProvider: no instance role found in IMDS");
    return role;
  }

  private async fetchCredentials(token: string, role: string): Promise<EcsCredentialsShape> {
    const res = await this.imdsGet(`${ROLE_PATH}/${role}`, token);
    return JSON.parse(res) as EcsCredentialsShape;
  }

  private async imdsGet(path: string, token: string): Promise<string> {
    const res = await this.http({
      method: "GET",
      url: this.base + path,
      headers: { "X-volc-ecs-metadata-token": token },
    });
    if (res.status < 200 || res.status > 299) {
      throw new Error(`EcsRoleCredentialProvider: IMDS GET ${path} failed with HTTP ${res.status}`);
    }
    return res.body;
  }
}
