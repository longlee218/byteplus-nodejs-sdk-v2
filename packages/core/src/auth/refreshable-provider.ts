import type { CredentialProvider, CredentialValue } from "./types.js";

/** Parse a BytePlus `ExpiredTime`/`Expiration` (RFC3339 / ISO 8601) to epoch ms. */
export function expiryFromString(s: string): number {
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new Error(`invalid expiry timestamp: ${s}`);
  return ms;
}

/** Fetched credential plus its absolute expiry, returned by a provider's fetch(). */
export interface FetchedCredential {
  value: CredentialValue;
  expiredAtMs: number;
}

/**
 * Base for HTTP credential providers that expire and refresh. Holds the cached
 * value + expiry and a single-flight in-flight Promise (replacing the Python
 * SDK's thread lock) so concurrent callers share one refresh. Subclasses supply
 * `fetch()`; expiry math and caching live here. See
 * docs/product/reference-byteplus-python-sdk/auth.md.
 */
export abstract class RefreshableCredentialProvider implements CredentialProvider {
  protected cached?: CredentialValue;
  protected expiredAtMs = 0;
  private inflight?: Promise<void>;
  protected readonly bufferMs: number;
  protected readonly clock: () => Date;

  constructor(bufferSeconds: number, clock?: () => Date) {
    this.bufferMs = bufferSeconds * 1000;
    this.clock = clock ?? (() => new Date());
  }

  protected nowMs(): number {
    return this.clock().getTime();
  }

  /** Fetch a fresh credential + expiry. Implemented per provider. */
  protected abstract fetch(): Promise<FetchedCredential>;

  isExpired(): boolean {
    return !this.cached || this.nowMs() + this.bufferMs >= this.expiredAtMs;
  }

  async getCredentials(): Promise<CredentialValue> {
    if (this.isExpired()) await this.refresh();
    return { ...(this.cached as CredentialValue) };
  }

  async retrieve(): Promise<CredentialValue> {
    if (this.cached) return { ...this.cached };
    return this.getCredentials();
  }

  async refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.inflight = this.doFetch();
    try {
      await this.inflight;
    } finally {
      this.inflight = undefined;
    }
  }

  private async doFetch(): Promise<void> {
    const fetched = await this.fetch();
    this.cached = fetched.value;
    this.expiredAtMs = fetched.expiredAtMs;
  }
}
