import type { HttpClient } from "../transport/http.js";
import { RefreshableCredentialProvider, type FetchedCredential } from "./refreshable-provider.js";
import { assumeRole, randomSessionName, roleTrn } from "./sts-client.js";

const DEFAULT_BUFFER_SECONDS = 60;
const MAX_BUFFER_SECONDS = 600;
const DEFAULT_DURATION_SECONDS = 3600;

export interface StsProviderOptions {
  region?: string;
  endpoint?: string;
  httpClient?: HttpClient;
  clock?: () => Date;
  bufferSeconds?: number;
  durationSeconds?: number;
  /** Fixed RoleSessionName (defaults to a random uuid hex). */
  sessionName?: string;
  policy?: string;
  /** Fixed invocation id for deterministic differential tests. */
  invocationId?: () => string;
}

/**
 * AssumeRole via a signed STS call through the core ApiClient. The caller ak/sk
 * sign the request; STS returns short-lived credentials that this provider
 * caches and refreshes before expiry. See
 * docs/product/reference-byteplus-python-sdk/auth.md § STS flows.
 */
export class StsCredentialProvider extends RefreshableCredentialProvider {
  constructor(
    private readonly ak: string,
    private readonly sk: string,
    private readonly roleName: string,
    private readonly accountId: string,
    private readonly opts: StsProviderOptions = {},
  ) {
    super(opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS, opts.clock);
    if ((opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS) > MAX_BUFFER_SECONDS) {
      throw new Error(`StsCredentialProvider: bufferSeconds must be <= ${MAX_BUFFER_SECONDS}`);
    }
  }

  protected async fetch(): Promise<FetchedCredential> {
    const params: Record<string, unknown> = {
      DurationSeconds: this.opts.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      RoleSessionName: this.opts.sessionName ?? randomSessionName(),
      RoleTrn: roleTrn(this.accountId, this.roleName),
    };
    if (this.opts.policy) params["Policy"] = this.opts.policy;
    return assumeRole(
      {
        ak: this.ak,
        sk: this.sk,
        region: this.opts.region,
        endpoint: this.opts.endpoint,
        httpClient: this.opts.httpClient,
        clock: this.opts.clock,
        invocationId: this.opts.invocationId,
      },
      { action: "AssumeRole", params, signed: true },
      "StsCredentialProvider",
    );
  }
}
