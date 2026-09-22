import type { HttpClient } from "../transport/http.js";
import { RefreshableCredentialProvider, type FetchedCredential } from "./refreshable-provider.js";
import { assumeRole, randomSessionName, roleTrn, samlProviderTrn } from "./sts-client.js";

const DEFAULT_BUFFER_SECONDS = 60;
const MAX_BUFFER_SECONDS = 600;
const DEFAULT_DURATION_SECONDS = 3600;

export interface StsSamlProviderOptions {
  region?: string;
  endpoint?: string;
  httpClient?: HttpClient;
  clock?: () => Date;
  bufferSeconds?: number;
  durationSeconds?: number;
  sessionName?: string;
  policy?: string;
}

/**
 * AssumeRoleWithSAML. Unsigned — the SAML assertion is the credential. Derives
 * RoleTrn and SAMLProviderTrn from the account id. See
 * docs/product/reference-byteplus-python-sdk/auth.md.
 */
export class StsSamlCredentialProvider extends RefreshableCredentialProvider {
  constructor(
    private readonly roleName: string,
    private readonly accountId: string,
    private readonly providerName: string,
    private readonly samlResp: string,
    private readonly opts: StsSamlProviderOptions = {},
  ) {
    super(opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS, opts.clock);
    if ((opts.bufferSeconds ?? DEFAULT_BUFFER_SECONDS) > MAX_BUFFER_SECONDS) {
      throw new Error(`StsSamlCredentialProvider: bufferSeconds must be <= ${MAX_BUFFER_SECONDS}`);
    }
  }

  protected async fetch(): Promise<FetchedCredential> {
    const params: Record<string, unknown> = {
      DurationSeconds: this.opts.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      RoleSessionName: this.opts.sessionName ?? randomSessionName(),
      RoleTrn: roleTrn(this.accountId, this.roleName),
      SAMLProviderTrn: samlProviderTrn(this.accountId, this.providerName),
      SAMLResp: this.samlResp,
    };
    if (this.opts.policy) params["Policy"] = this.opts.policy;
    return assumeRole(
      {
        region: this.opts.region,
        endpoint: this.opts.endpoint,
        httpClient: this.opts.httpClient,
        clock: this.opts.clock,
      },
      { action: "AssumeRoleWithSAML", params, signed: false },
      "StsSamlCredentialProvider",
    );
  }
}
