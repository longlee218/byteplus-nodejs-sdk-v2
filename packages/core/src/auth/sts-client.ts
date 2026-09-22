import { randomUUID } from "node:crypto";
import { ApiClient } from "../transport/api-client.js";
import { Configuration } from "../transport/configuration.js";
import type { HttpClient } from "../transport/http.js";
import type { CredentialValue } from "./types.js";
import { expiryFromString, type FetchedCredential } from "./refreshable-provider.js";

/** Default STS region/host, matching the Python SDK. */
export const DEFAULT_STS_REGION = "ap-southeast-1";
/** STS API version for AssumeRole / AssumeRoleWithOIDC / AssumeRoleWithSAML. */
export const STS_VERSION = "2018-01-01";

/** trn of an IAM role. */
export function roleTrn(accountId: string, roleName: string): string {
  return `trn:iam::${accountId}:role/${roleName}`;
}

/** trn of a SAML identity provider. */
export function samlProviderTrn(accountId: string, providerName: string): string {
  return `trn:iam::${accountId}:saml-provider/${providerName}`;
}

/** A random RoleSessionName (uuid4 hex), matching the Python SDK's default. */
export function randomSessionName(): string {
  return randomUUID().replace(/-/g, "");
}

/** Transport knobs shared by every STS provider. */
export interface StsTransportOptions {
  /** Caller ak — present only for the signed AssumeRole flow. */
  ak?: string;
  sk?: string;
  region?: string;
  /** STS host override (e.g. a custom endpoint); default `sts.<region>.byteplusapi.com`. */
  endpoint?: string;
  httpClient?: HttpClient;
  clock?: () => Date;
  /** Fixed invocation id for deterministic differential tests. */
  invocationId?: () => string;
}

/** One STS AssumeRole* invocation. */
export interface StsCall {
  action: string;
  params: Record<string, unknown>;
  /** AssumeRole is signed with the caller ak/sk; OIDC/SAML are unsigned (token is the credential). */
  signed: boolean;
}

interface StsCredentialsShape {
  AccessKeyId?: string;
  SecretAccessKey?: string;
  SessionToken?: string;
  ExpiredTime?: string;
  Expiration?: string;
}

/**
 * Run an STS AssumeRole* call through the core ApiClient (GET + text/plain, so
 * params flatten to the query — the Python UniversalApi path) and parse the
 * returned Credentials. Signed or unsigned per `call.signed`.
 */
export async function assumeRole(
  transport: StsTransportOptions,
  call: StsCall,
  providerName: string,
): Promise<FetchedCredential> {
  const config = new Configuration({
    ak: transport.ak,
    sk: transport.sk,
    region: transport.region ?? DEFAULT_STS_REGION,
    host: transport.endpoint,
    httpClient: transport.httpClient,
    clock: transport.clock,
    invocationId: transport.invocationId,
    // Python's STS provider uses num_max_retries = max_retries-1 (default 3-1),
    // which the signed X-Sdk-Request "max=" reflects. Match it for byte-parity.
    maxRetries: 2,
  });
  const client = new ApiClient(config);
  const result = await client.callApi<{ Credentials?: StsCredentialsShape }>({
    resourcePath: `/${call.action}/${STS_VERSION}/sts/get/text_plain/`,
    method: "GET",
    // Content-Type text/plain matches the Python UniversalApi STS call and is
    // part of the signed headers (differential parity, US-008).
    headerParams: { "Content-Type": "text/plain" },
    body: call.params,
    authSettings: call.signed ? ["byteplusSign"] : [],
  });
  const c = result?.Credentials;
  if (!c || !c.AccessKeyId || !c.SecretAccessKey) {
    throw new Error(`${providerName}: STS response did not contain Credentials`);
  }
  const expiry = c.ExpiredTime ?? c.Expiration;
  if (!expiry) throw new Error(`${providerName}: STS Credentials missing ExpiredTime/Expiration`);
  const value: CredentialValue = {
    ak: c.AccessKeyId,
    sk: c.SecretAccessKey,
    sessionToken: c.SessionToken,
    providerName,
  };
  return { value, expiredAtMs: expiryFromString(expiry) };
}
