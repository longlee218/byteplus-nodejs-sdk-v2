import { signV4 } from "../signer.js";
import { urlencode } from "../encoding.js";
import { DefaultCredentialProvider } from "../auth/default-provider.js";
import type { CredentialValue } from "../auth/types.js";
import { Configuration } from "./configuration.js";
import { buildRequest } from "./build.js";
import { resolveEndpoint } from "./endpoint.js";
import { ApiException } from "./exceptions.js";
import { deserializeByType } from "./registry.js";
import { backoffDelayMs, isRetryableStatus } from "./retry.js";

export interface CallApiArgs {
  resourcePath: string;
  method: string;
  headerParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  /** Registry type name of the request body model (for attributeMap serialization). */
  requestType?: string;
  /** Registry type name of the response model (for deserialization). */
  responseType?: string;
  /** Empty array disables signing (matches Python `auth_settings`). */
  authSettings?: string[];
}

/** Runs the BytePlus request pipeline: build -> resolve-endpoint -> sign -> HTTP -> deserialize. */
export class ApiClient {
  constructor(private readonly config: Configuration = new Configuration()) {}

  async callApi<T = unknown>(args: CallApiArgs): Promise<T> {
    const built = buildRequest(
      {
        resourcePath: args.resourcePath,
        method: args.method,
        headers: args.headerParams ?? {},
        query: args.queryParams ?? {},
        body: args.body,
        requestType: args.requestType,
      },
      this.config.registry,
    );
    const endpoint = resolveEndpoint(built.service, this.config);
    const authOn = args.authSettings === undefined || args.authSettings.length > 0;
    const creds = authOn ? await this.resolveCredentials() : undefined;
    const url = endpoint.prefix + built.truePath + this.queryString(built.query);
    // One invocation id per call, reused across retries (Python parity).
    const invocationId = this.config.invocationId();

    let attempt = 0;
    // Sleep + advance the attempt counter; returns false once retries are spent.
    const backoff = async (): Promise<boolean> => {
      if (attempt >= this.config.maxRetries) return false;
      await this.config.sleep(backoffDelayMs(attempt));
      attempt += 1;
      return true;
    };

    for (;;) {
      const headers = { ...built.headers };
      headers["User-Agent"] = this.config.userAgent;
      if (creds) {
        headers["Host"] = endpoint.host;
        // SDK tracking headers are signed (X-*), so they must be set before
        // signV4 — matching the Python SignRequestInterceptor. Invocation id is
        // constant across retries; the attempt counter increments.
        headers["X-Sdk-Invocation-Id"] = invocationId;
        headers["X-Sdk-Request"] = `attempt=${attempt + 1}; max=${this.config.maxRetries + 1}`;
        signV4(
          { path: built.truePath, method: built.method, headers, body: built.body, query: built.query },
          creds,
          { region: this.config.region, service: built.service, clock: this.config.clock },
        );
      }
      try {
        const res = await this.config.httpClient({ method: built.method, url, headers, body: built.body });
        if (res.status < 200 || res.status > 299) {
          if (isRetryableStatus(res.status) && (await backoff())) continue;
          throw new ApiException(res.status, `HTTP ${res.status}`, res.body, res.headers);
        }
        return this.deserialize<T>(res.body, args.responseType);
      } catch (error) {
        if (error instanceof ApiException) throw error; // business/HTTP errors are not re-retried
        if (await backoff()) continue; // network/transport error
        throw error;
      }
    }
  }

  private async resolveCredentials(): Promise<CredentialValue> {
    if (this.config.credentialProvider) return this.config.credentialProvider.getCredentials();
    if (this.config.ak && this.config.sk) {
      return { ak: this.config.ak, sk: this.config.sk, sessionToken: this.config.sessionToken };
    }
    return new DefaultCredentialProvider().getCredentials();
  }

  private queryString(query: Record<string, string>): string {
    const pairs = Object.entries(query);
    return pairs.length === 0 ? "" : "?" + urlencode(pairs);
  }

  private deserialize<T>(body: string, responseType?: string): T {
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      throw new ApiException(200, "response body is not valid JSON", body);
    }
    const record = data as Record<string, unknown> | null;
    const metadata = record?.["ResponseMetadata"] as Record<string, unknown> | undefined;
    if (!metadata) throw new ApiException(200, "InternalServiceError", body);
    if (metadata["Error"]) throw new ApiException(200, JSON.stringify(metadata["Error"]), body);
    return deserializeByType(record?.["Result"], responseType, this.config.registry) as T;
  }
}
