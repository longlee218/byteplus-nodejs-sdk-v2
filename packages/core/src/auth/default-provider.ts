import { CLIConfigCredentialProvider } from "./cli-config-provider.js";
import { EnvironmentVariableCredentialProvider } from "./env-provider.js";
import { EcsRoleCredentialProvider } from "./ecs-provider.js";
import { StsOidcCredentialProvider } from "./sts-oidc-provider.js";
import type { CredentialProvider, CredentialValue } from "./types.js";

export interface DefaultProviderOptions {
  /** Override the provider chain. Defaults to the full Python order. */
  providers?: CredentialProvider[];
}

/**
 * Tries providers in order, caching the last one that succeeded. Default chain
 * matches the Python SDK: env -> sts-oidc (env-driven) -> cli-config -> ecs.
 * Ecs is appended only when `BYTEPLUS_ECS_METADATA_DISABLED != "true"`. See
 * docs/product/reference-byteplus-python-sdk/auth.md § Default chain.
 */
export class DefaultCredentialProvider implements CredentialProvider {
  private readonly providers: CredentialProvider[];
  private lastProvider: CredentialProvider | undefined;

  constructor(opts: DefaultProviderOptions = {}) {
    this.providers = opts.providers ?? DefaultCredentialProvider.buildDefaultChain();
  }

  private static buildDefaultChain(): CredentialProvider[] {
    const chain: CredentialProvider[] = [
      new EnvironmentVariableCredentialProvider(),
      new StsOidcCredentialProvider(),
      new CLIConfigCredentialProvider(),
    ];
    if (process.env["BYTEPLUS_ECS_METADATA_DISABLED"] !== "true") {
      chain.push(new EcsRoleCredentialProvider());
    }
    return chain;
  }

  async getCredentials(): Promise<CredentialValue> {
    if (this.lastProvider) {
      try {
        return await this.lastProvider.getCredentials();
      } catch {
        this.lastProvider = undefined;
      }
    }
    const errors: string[] = [];
    for (const provider of this.providers) {
      try {
        const value = await provider.getCredentials();
        this.lastProvider = provider;
        return value;
      } catch (error) {
        errors.push(`  - ${provider.constructor.name}: ${(error as Error).message}`);
      }
    }
    throw new Error(
      "DefaultCredentialProvider: unable to resolve credentials from any provider:\n" + errors.join("\n"),
    );
  }

  async retrieve(): Promise<CredentialValue> {
    if (this.lastProvider) return this.lastProvider.retrieve();
    return this.getCredentials();
  }

  isExpired(): boolean {
    return this.lastProvider ? this.lastProvider.isExpired() : true;
  }

  async refresh(): Promise<void> {
    if (!this.lastProvider) return;
    try {
      await this.lastProvider.refresh();
    } catch {
      this.lastProvider = undefined;
      await this.getCredentials();
    }
  }
}
