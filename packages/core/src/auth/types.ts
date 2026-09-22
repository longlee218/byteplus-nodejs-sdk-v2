// Credential model + provider interface. Ports byteplussdkcore/auth. See
// docs/product/reference-byteplus-python-sdk/auth.md.

/**
 * A resolved credential. Carries no expiry — expiry state lives on the
 * provider instance (matching the Python SDK's CredentialValue).
 */
export interface CredentialValue {
  ak: string;
  sk: string;
  sessionToken?: string;
  providerName?: string;
}

/** A source of credentials. All methods are async so HTTP providers (US-007) share it. */
export interface CredentialProvider {
  /** Primary entry: refresh if needed, then return the credential, or throw. */
  getCredentials(): Promise<CredentialValue>;
  /** Return the cached credential without fetching. */
  retrieve(): Promise<CredentialValue>;
  /** Whether the currently-held credential is expired. */
  isExpired(): boolean;
  /** Force a re-fetch when expired. No-op for non-expiring providers. */
  refresh(): Promise<void>;
}
