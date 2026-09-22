// @byteplus-sdk/core — engine surface.

/** Package identity marker, used by cross-package and dual-resolution tests. */
export const CORE_PACKAGE = "@byteplus-sdk/core";

/** Semver of the core package at build time. */
export const version = "0.1.0";

export {
  signV4,
  signUrl,
  getSigningKey,
  type SignableRequest,
  type SignCredentials,
  type SignContext,
  type SignComponents,
  type SignUrlArgs,
} from "./signer.js";

export { pctEncode, quotePlus, urlencode, canonicalQuery } from "./encoding.js";

export type { CredentialValue, CredentialProvider } from "./auth/types.js";
export { StaticCredentialProvider } from "./auth/static-provider.js";
export { EnvironmentVariableCredentialProvider } from "./auth/env-provider.js";
export { CLIConfigCredentialProvider, type CliConfigOptions } from "./auth/cli-config-provider.js";
export { DefaultCredentialProvider, type DefaultProviderOptions } from "./auth/default-provider.js";
export {
  RefreshableCredentialProvider,
  expiryFromString,
  type FetchedCredential,
} from "./auth/refreshable-provider.js";
export { StsCredentialProvider, type StsProviderOptions } from "./auth/sts-provider.js";
export { StsOidcCredentialProvider, type StsOidcProviderOptions } from "./auth/sts-oidc-provider.js";
export { StsSamlCredentialProvider, type StsSamlProviderOptions } from "./auth/sts-saml-provider.js";
export { EcsRoleCredentialProvider, type EcsProviderOptions } from "./auth/ecs-provider.js";

export { Configuration, type ConfigurationOptions } from "./transport/configuration.js";
export { ApiClient, type CallApiArgs } from "./transport/api-client.js";
export { ApiException } from "./transport/exceptions.js";
export {
  ModelRegistry,
  defaultRegistry,
  type ModelMeta,
  serializeModel,
  deserializeModel,
  serializeByType,
  deserializeByType,
} from "./transport/registry.js";
export { parseResourcePath, reqToParams, buildRequest } from "./transport/build.js";
export { pyJsonStringify } from "./transport/py-json.js";
export { resolveEndpoint } from "./transport/endpoint.js";
export { isRetryableStatus, backoffDelayMs } from "./transport/retry.js";
export {
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  fetchHttpClient,
} from "./transport/http.js";
