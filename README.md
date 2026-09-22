# BytePlus SDK for Node.js (v2)

A TypeScript port of the [BytePlus Python SDK v2](https://github.com/byteplus-sdk/byteplus-python-sdk-v2),
published as a monorepo of scoped, dual **ESM + CommonJS** packages. Request
signing and credential resolution are **byte-for-byte compatible** with the
Python SDK — verified by golden requests captured from the Python SDK itself.

| Package | Description |
| --- | --- |
| [`@byteplus-sdk/core`](./packages/core) | SignatureV4 signing, credential providers, HTTP transport pipeline |
| [`@byteplus-sdk/vod`](./packages/vod) | VOD service client (`vod20250701`): `StartExecution`, `GetExecution` |

## Table of Contents

- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [Credentials](#credentials)
- [Endpoint configuration](#endpoint-configuration)
- [Transport](#transport)
- [Timeouts](#timeouts)
- [Retries](#retries)
- [Error handling](#error-handling)
- [Environment variables](#environment-variables)
- [Compatibility with the Python SDK](#compatibility-with-the-python-sdk)
- [Development](#development)

## Requirements

- **Node.js >= 18** (the default HTTP client uses the global `fetch`).
- TypeScript is optional; typings ship with every package.

## Install

```sh
npm install @byteplus-sdk/vod @byteplus-sdk/core
# or: pnpm add / yarn add
```

Both `import` (ESM) and `require` (CommonJS) are supported.

## Usage

```ts
import { Configuration, DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodApi } from "@byteplus-sdk/vod";

const api = new VodApi(
  new Configuration({
    region: "ap-southeast-1",
    credentialProvider: new DefaultCredentialProvider(), // resolves credentials from env/CLI/ECS
  }),
);

const started = await api.startExecution({ input: { type: "vid", vid: "your-vid" } });
const execution = await api.getExecution({ runId: started.runId! });
```

## Credentials

Credentials are **never hard-coded**. Supply them one of the ways below (this
mirrors the Python SDK's credential model, including the env var and CLI config
key names). Every provider implements the same `CredentialProvider` interface.

### Static

```ts
import { StaticCredentialProvider } from "@byteplus-sdk/core";
new Configuration({ credentialProvider: new StaticCredentialProvider(ak, sk, sessionToken) });
```

Or set `ak` / `sk` directly on `Configuration`.

### Environment variables

```ts
import { EnvironmentVariableCredentialProvider } from "@byteplus-sdk/core";
```

Reads `BYTEPLUS_ACCESSKEY` (or `BYTEPLUS_ACCESS_KEY`), `BYTEPLUS_SECRETKEY` (or
`BYTEPLUS_SECRET_KEY`), and optionally `BYTEPLUS_SESSION_TOKEN`.

### byteplus-cli config file

```ts
import { CLIConfigCredentialProvider } from "@byteplus-sdk/core";
```

Reads `~/.byteplus/config.json` (override with `BYTEPLUS_CLI_CONFIG_FILE`),
selecting the profile from `BYTEPLUS_PROFILE` → `config.current` → `default`.
Supported profile `mode`s: `ak`, `ramrolearn` (STS AssumeRole), `oidc`,
`ecsrole`.

### STS / federated / instance role

```ts
import {
  StsCredentialProvider,        // AssumeRole (signed with your ak/sk)
  StsOidcCredentialProvider,    // AssumeRoleWithOIDC (env-driven, BYTEPLUS_OIDC_*)
  StsSamlCredentialProvider,    // AssumeRoleWithSAML
  EcsRoleCredentialProvider,    // BytePlus ECS instance metadata (IMDS)
} from "@byteplus-sdk/core";
```

Temporary credentials refresh automatically before expiry.

### Default chain

```ts
import { DefaultCredentialProvider } from "@byteplus-sdk/core";
new Configuration({ credentialProvider: new DefaultCredentialProvider() });
```

Tries, in order (matching the Python SDK): **environment → STS OIDC → cli-config
→ ECS role** (ECS is skipped when `BYTEPLUS_ECS_METADATA_DISABLED=true`). The
first provider that resolves wins and is cached.

## Endpoint configuration

- **Region** (default `ap-southeast-1`): `new Configuration({ region: "..." })`
  resolves the host as `<service>.<region>.byteplusapi.com`.
- **Custom host override**: `new Configuration({ host: "open.example.com" })` (or
  a full `https://…` URL) is used verbatim.
- **Dual stack**: `new Configuration({ useDualStack: true })` uses the
  `.byteplus-api.com` suffix (also enabled by `BYTEPLUS_ENABLE_DUALSTACK=true`).

## Transport

- **Scheme** defaults to `https` (`new Configuration({ scheme: "http" })` to
  override — not recommended).
- **Injectable HTTP client**: the default is a `fetch`-based client; pass your
  own to add proxies, connection pooling, or custom TLS:
  ```ts
  new Configuration({ httpClient: async (req) => ({ status, headers, body }) });
  ```
  Proxy and connection-pool tuning are **not** built into the default client —
  supply a custom `httpClient` if you need them.

## Timeouts

`connectTimeoutMs` and `readTimeoutMs` (both default `30000`) are configuration
fields. **Note:** the default `fetch` client does not yet enforce them — honor
them in a custom `httpClient` (e.g. via `AbortController`) if you need request
timeouts today.

## Retries

Enabled by default. `maxRetries` (default `3`, i.e. up to 4 attempts) retries
transient failures — HTTP `429/500/502/503/504` and network errors — with
exponential backoff plus jitter. Each attempt is re-signed. Set
`new Configuration({ maxRetries: 0 })` to disable.

## Error handling

Calls throw an `ApiException` carrying `status`, the reason, and the raw body:

```ts
import { ApiException } from "@byteplus-sdk/core";

try {
  await api.getExecution({ runId });
} catch (err) {
  if (err instanceof ApiException) {
    console.error(err.status, err.message, err.body);
  }
}
```

BytePlus returns some errors with HTTP 200 and an error in `ResponseMetadata`;
the SDK surfaces those as an `ApiException` too (status `200`).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `BYTEPLUS_ACCESSKEY` / `BYTEPLUS_ACCESS_KEY` | Access key |
| `BYTEPLUS_SECRETKEY` / `BYTEPLUS_SECRET_KEY` | Secret key |
| `BYTEPLUS_SESSION_TOKEN` | Session token (temporary credentials) |
| `BYTEPLUS_CLI_CONFIG_FILE` | byteplus-cli config path (default `~/.byteplus/config.json`) |
| `BYTEPLUS_PROFILE` | cli-config profile name |
| `BYTEPLUS_ENABLE_DUALSTACK` | `true` to use the dual-stack endpoint suffix |
| `BYTEPLUS_ECS_METADATA_DISABLED` | `true` to skip the ECS role provider |
| `BYTEPLUS_ECS_METADATA` | ECS role name (else auto-detected) |
| `BYTEPLUS_OIDC_ROLE_TRN` / `BYTEPLUS_OIDC_TOKEN_FILE` | OIDC role trn / token file |
| `BYTEPLUS_OIDC_ROLE_SESSION_NAME` / `BYTEPLUS_OIDC_ROLE_POLICY` | OIDC session name / policy |
| `BYTEPLUS_OIDC_STS_ENDPOINT` | OIDC STS endpoint override |
| `BYTEPLUS_REGION` | Region used by the runnable example |

## Compatibility with the Python SDK

The signed request this SDK sends is byte-for-byte identical to the Python SDK's
for the same inputs. This is proven, not asserted: `packages/core` ships golden
requests captured from the actual Python SDK (`StartExecution`, `GetExecution`,
`AssumeRole`) — including the SignatureV4 signature, `X-Sdk-*` headers, and the
`json.dumps`-compatible body — and the test suite fails if the Node output drifts.

Reference commit of the Python SDK: `e98d2e9`.

## Development

```sh
pnpm install
pnpm run build       # tsup: CJS + ESM + d.ts for every package
pnpm run typecheck   # per-package tsc + the example
pnpm run test        # build, then vitest (live smoke skipped without credentials)
```

### Runnable example & live smoke

- [`examples/vod-execution.ts`](./examples/vod-execution.ts) — starts a VOD
  execution and polls it; reads credentials from the environment. Run:
  `pnpm dlx tsx examples/vod-execution.ts`.
- `packages/vod/test/live.smoke.test.ts` hits real BytePlus VOD and is **skipped**
  unless `BYTEPLUS_ACCESSKEY` / `BYTEPLUS_SECRETKEY` are set.

## License

Apache-2.0. See [LICENSE](./LICENSE).
