import type { CredentialProvider, CredentialValue } from "./types.js";

/** Fixed credentials supplied inline. Never expires. */
export class StaticCredentialProvider implements CredentialProvider {
  private readonly value: CredentialValue;

  constructor(ak: string, sk: string, sessionToken?: string) {
    this.value = { ak, sk, sessionToken, providerName: "StaticCredentialProvider" };
  }

  async getCredentials(): Promise<CredentialValue> {
    return { ...this.value };
  }

  async retrieve(): Promise<CredentialValue> {
    return { ...this.value };
  }

  isExpired(): boolean {
    return false;
  }

  async refresh(): Promise<void> {
    // No-op: static credentials never expire.
  }
}
