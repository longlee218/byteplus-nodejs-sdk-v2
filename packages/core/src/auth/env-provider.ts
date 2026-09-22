import type { CredentialProvider, CredentialValue } from "./types.js";

const AK_VARS = ["BYTEPLUS_ACCESSKEY", "BYTEPLUS_ACCESS_KEY"] as const;
const SK_VARS = ["BYTEPLUS_SECRETKEY", "BYTEPLUS_SECRET_KEY"] as const;
const TOKEN_VAR = "BYTEPLUS_SESSION_TOKEN";

function firstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const v = process.env[name];
    if (v) return v;
  }
  return undefined;
}

/**
 * Reads credentials from environment variables on every call (no caching),
 * matching the Python SDK. AK: BYTEPLUS_ACCESSKEY | BYTEPLUS_ACCESS_KEY;
 * SK: BYTEPLUS_SECRETKEY | BYTEPLUS_SECRET_KEY; token: BYTEPLUS_SESSION_TOKEN.
 */
export class EnvironmentVariableCredentialProvider implements CredentialProvider {
  async getCredentials(): Promise<CredentialValue> {
    const ak = firstEnv(AK_VARS);
    const sk = firstEnv(SK_VARS);
    if (!ak || !sk) {
      throw new Error(
        "EnvironmentVariableCredentialProvider: set BYTEPLUS_ACCESSKEY and " +
          "BYTEPLUS_SECRETKEY (or the *_ACCESS_KEY / *_SECRET_KEY aliases)",
      );
    }
    const sessionToken = process.env[TOKEN_VAR] || undefined;
    return { ak, sk, sessionToken, providerName: "EnvironmentVariableCredentialProvider" };
  }

  async retrieve(): Promise<CredentialValue> {
    return this.getCredentials();
  }

  isExpired(): boolean {
    return false;
  }

  async refresh(): Promise<void> {
    // No-op: re-reads the environment on every getCredentials().
  }
}
