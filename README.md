# BytePlus SDK for Node.js

A TypeScript SDK for [BytePlus](https://www.byteplus.com/), ported from the
official [BytePlus Python SDK v2](https://github.com/byteplus-sdk/byteplus-python-sdk-v2).
It is published as a monorepo of small, scoped packages so you install only the
services you use, and every package ships as **dual ESM + CommonJS** with full
type declarations.

Request signing and credential resolution are **byte-for-byte compatible** with
the Python SDK — verified by golden requests captured from the Python SDK itself,
not merely re-implemented.

## Features

- 🔐 **BytePlus SignatureV4** request signing — identical on the wire to the Python SDK.
- 🔑 **Full credential model** — static keys, environment, byteplus-cli config, STS
  (AssumeRole / OIDC / SAML), ECS instance role, and an automatic default chain.
- 🌐 **Correct endpoint resolution** — regional, global, and China-region services.
- ♻️ **Built-in retries** with exponential backoff + jitter.
- 🧩 **Typed models** for every service, with idiomatic camelCase mapped to the
  BytePlus wire format.
- 📦 **Dual ESM + CommonJS**, `import` and `require` both supported. No runtime dependencies.

## Packages

| Package | Description | Version |
| --- | --- | --- |
| [`@byteplus-sdk/core`](./packages/core) | Foundation: signing, credential providers, HTTP transport. Required by every service package. | `0.1.0` |
| [`@byteplus-sdk/vod`](./packages/vod) | VOD service client (`vod20250701`). | `0.1.0` |

> More BytePlus service packages will be published under the `@byteplus-sdk/*`
> scope over time. Each depends on `@byteplus-sdk/core`.

## Requirements

- **Node.js >= 18** (the default HTTP client uses the global `fetch`).
- TypeScript is optional — typings are bundled with every package.

## Installation

Install `@byteplus-sdk/core` plus the service package(s) you need. For example,
to use VOD:

```sh
# npm
npm install @byteplus-sdk/core @byteplus-sdk/vod

# pnpm
pnpm add @byteplus-sdk/core @byteplus-sdk/vod

# yarn
yarn add @byteplus-sdk/core @byteplus-sdk/vod
```

`@byteplus-sdk/core` is a dependency of every service package; installing it
explicitly keeps its version under your control. If you only need signing and
credential resolution (e.g. to build your own client), install `@byteplus-sdk/core`
on its own.

## Quick start

Every service client is constructed from a `Configuration` (from
`@byteplus-sdk/core`) that carries the region and a credential source. Using VOD
as the example:

```ts
import { Configuration, DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodApi } from "@byteplus-sdk/vod";

const config = new Configuration({
  region: "ap-southeast-1",
  credentialProvider: new DefaultCredentialProvider(), // reads env / CLI / ECS
});

const vod = new VodApi(config);

const started = await vod.startExecution({ input: { type: "vid", vid: "your-vid" } });
const execution = await vod.getExecution({ runId: started.runId! });
```

Provide credentials via the environment (never hard-code them):

```sh
export BYTEPLUS_ACCESSKEY=...
export BYTEPLUS_SECRETKEY=...
```

CommonJS works the same way with `require`:

```js
const { Configuration, DefaultCredentialProvider } = require("@byteplus-sdk/core");
const { VodApi } = require("@byteplus-sdk/vod");
```

## Configuration

The sections below apply to every service client, since they all share
`@byteplus-sdk/core`.

### Credentials

Credentials are supplied through a `CredentialProvider`. The env var and
byteplus-cli config key names match the Python SDK exactly.

| Provider | Source |
| --- | --- |
| `StaticCredentialProvider(ak, sk, sessionToken?)` | Inline keys |
| `EnvironmentVariableCredentialProvider` | `BYTEPLUS_ACCESSKEY`/`BYTEPLUS_ACCESS_KEY`, `BYTEPLUS_SECRETKEY`/`BYTEPLUS_SECRET_KEY`, `BYTEPLUS_SESSION_TOKEN` |
| `CLIConfigCredentialProvider` | `~/.byteplus/config.json` (modes `ak`, `ramrolearn`, `oidc`, `ecsrole`) |
| `StsCredentialProvider` | STS `AssumeRole` (signed with your keys) |
| `StsOidcCredentialProvider` / `StsSamlCredentialProvider` | Federated identity (`BYTEPLUS_OIDC_*`) |
| `EcsRoleCredentialProvider` | BytePlus ECS instance metadata (IMDS) |
| `DefaultCredentialProvider` | Chain: environment → STS OIDC → cli-config → ECS role |

```ts
import { StaticCredentialProvider } from "@byteplus-sdk/core";
new Configuration({ credentialProvider: new StaticCredentialProvider(ak, sk) });
```

Temporary (STS/ECS) credentials refresh automatically before they expire.

### Endpoint

- **Region** (default `ap-southeast-1`) resolves the host from a per-service
  table, matching the Python SDK — including global services and China regions.
- **Custom host**: `new Configuration({ host: "open.example.com" })` (or a full
  `https://…` URL) is used verbatim.
- **Dual stack**: `new Configuration({ useDualStack: true })`.

### Transport

- HTTPS by default. Override the HTTP layer with your own client for proxies,
  connection pooling, or custom TLS:
  ```ts
  new Configuration({ httpClient: async (req) => ({ status, headers, body }) });
  ```
  Proxy/pool/TLS tuning is not built into the default `fetch` client — supply a
  custom `httpClient` if you need it.

### Timeouts

`connectTimeoutMs` / `readTimeoutMs` (default `30000`) are configuration fields.
The default `fetch` client does not yet enforce them — apply them in a custom
`httpClient` (e.g. via `AbortController`) if you need request timeouts today.

### Retries

Enabled by default: `maxRetries` (default `3`) retries `429`/`5xx` and network
errors with exponential backoff + jitter, re-signing each attempt. Set
`maxRetries: 0` to disable.

### Error handling

Calls throw an `ApiException` carrying `status`, a message, and the raw body.
BytePlus returns some errors with HTTP 200 and a `ResponseMetadata.Error`; those
are surfaced as an `ApiException` too.

```ts
import { ApiException } from "@byteplus-sdk/core";

try {
  await vod.getExecution({ runId });
} catch (err) {
  if (err instanceof ApiException) console.error(err.status, err.message, err.body);
}
```

### Environment variables

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

## Compatibility with the Python SDK

The request this SDK sends is byte-for-byte identical to the Python SDK's for the
same inputs. This is proven, not asserted: `@byteplus-sdk/core` ships golden
requests captured from the actual Python SDK (including the SignatureV4
signature, `X-Sdk-*` headers, and the `json.dumps`-compatible PascalCase body),
and the test suite fails if the Node output drifts. Reference Python SDK commit:
`e98d2e9`.

## Development

```sh
pnpm install
pnpm run build       # tsup: CJS + ESM + d.ts for every package
pnpm run typecheck
pnpm run test        # build, then vitest
```

A runnable example lives at [`examples/vod-execution.ts`](./examples/vod-execution.ts).

## License

[Apache-2.0](./LICENSE).
