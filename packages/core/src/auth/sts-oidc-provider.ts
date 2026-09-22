import { readFile } from "node:fs/promises";
import type { HttpClient } from "../transport/http.js";
import { RefreshableCredentialProvider, type FetchedCredential } from "./refreshable-provider.js";
import { assumeRole, randomSessionName } from "./sts-client.js";

const DEFAULT_BUFFER_SECONDS = 60;
const MAX_BUFFER_SECONDS = 600;
const DEFAULT_DURATION_SECONDS = 3600;

export interface StsOidcProviderOptions {
  /** Overrides env `BYTEPLUS_OIDC_ROLE_TRN`. */
  roleTrn?: string;
  /** Overrides env `BYTEPLUS_OIDC_TOKEN_FILE`. */
  tokenFile?: string;
  /** Overrides env `BYTEPLUS_OIDC_ROLE_SESSION_NAME`. */
  roleSessionName?: string;
  /** Overrides env `BYTEPLUS_OIDC_ROLE_POLICY`. */
  policy?: string;
  /** Overrides env `BYTEPLUS_OIDC_STS_ENDPOINT`. */
  endpoint?: string;
  region?: string;
  httpClient?: HttpClient;
  clock?: () => Date;
  bufferSeconds?: number;
  durationSeconds?: number;
}

/**
 * AssumeRoleWithOIDC. Env-driven when zero-arg (as the default chain builds it);
 * cli-config passes explicit opts. The STS call is UNSIGNED — the OIDC token is
 * the credential. See docs/product/reference-byteplus-python-sdk/auth.md.
 */
export class StsOidcCredentialProvider extends RefreshableCredentialProvider {
  constructor(private readonly opts: StsOidcProviderOptions = {}) {
    super(opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS, opts.clock);
    if ((opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS) > MAX_BUFFER_SECONDS) {
      throw new Error(`StsOidcCredentialProvider: bufferSeconds must be <= ${MAX_BUFFER_SECONDS}`);
    }
  }

  protected async fetch(): Promise<FetchedCredential> {
    const roleTrn = this.opts.roleTrn ?? process.env["BYTEPLUS_OIDC_ROLE_TRN"];
    const tokenFile = this.opts.tokenFile ?? process.env["BYTEPLUS_OIDC_TOKEN_FILE"];
    if (!roleTrn) throw new Error("StsOidcCredentialProvider: BYTEPLUS_OIDC_ROLE_TRN (or roleTrn) is required");
    if (!tokenFile) throw new Error("StsOidcCredentialProvider: BYTEPLUS_OIDC_TOKEN_FILE (or tokenFile) is required");

    let token: string;
    try {
      token = (await readFile(tokenFile, "utf8")).trim();
    } catch {
      throw new Error(`StsOidcCredentialProvider: cannot read OIDC token file at ${tokenFile}`);
    }
    if (!token) throw new Error(`StsOidcCredentialProvider: OIDC token file at ${tokenFile} is empty`);

    const params: Record<string, unknown> = {
      DurationSeconds: this.opts.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      RoleSessionName:
        this.opts.roleSessionName ?? process.env["BYTEPLUS_OIDC_ROLE_SESSION_NAME"] ?? randomSessionName(),
      RoleTrn: roleTrn,
      OIDCToken: token,
    };
    const policy = this.opts.policy ?? process.env["BYTEPLUS_OIDC_ROLE_POLICY"];
    if (policy) params["Policy"] = policy;

    return assumeRole(
      {
        region: this.opts.region,
        endpoint: this.opts.endpoint ?? process.env["BYTEPLUS_OIDC_STS_ENDPOINT"],
        httpClient: this.opts.httpClient,
        clock: this.opts.clock,
      },
      { action: "AssumeRoleWithOIDC", params, signed: false },
      "StsOidcCredentialProvider",
    );
  }
}
