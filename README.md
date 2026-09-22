# BytePlus Node.js SDK v2

TypeScript port of the BytePlus SDK, published as a monorepo of scoped packages.

| Package | Description |
| --- | --- |
| [`@byteplus-sdk/core`](./packages/core) | Signing (SignatureV4), credential providers, HTTP transport |
| [`@byteplus-sdk/vod`](./packages/vod) | VOD service client (`vod20250701`): `StartExecution`, `GetExecution` |

Requires Node.js >= 18.

## Install

```sh
npm install @byteplus-sdk/vod @byteplus-sdk/core
```

## Quick start

```ts
import { Configuration, DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodApi } from "@byteplus-sdk/vod";

const api = new VodApi(
  new Configuration({
    region: "ap-southeast-1",
    credentialProvider: new DefaultCredentialProvider(),
  }),
);

const started = await api.startExecution({ /* input: { ... } */ });
const execution = await api.getExecution({ runId: started.runId! });
```

Credentials are read from the environment; never hard-code them:

```sh
export BYTEPLUS_ACCESSKEY=...
export BYTEPLUS_SECRETKEY=...
export BYTEPLUS_REGION=ap-southeast-1   # optional; this is the default
```

## Runnable example

[`examples/vod-execution.ts`](./examples/vod-execution.ts) starts a VOD
execution and polls it. It reads credentials from the environment and is run
manually (not in CI):

```sh
pnpm dlx tsx examples/vod-execution.ts
```

## Live smoke test

`packages/vod/test/live.smoke.test.ts` hits real BytePlus VOD. It is **skipped**
unless `BYTEPLUS_ACCESSKEY` and `BYTEPLUS_SECRETKEY` are set, so CI stays green
without credentials. Run it manually:

```sh
BYTEPLUS_ACCESSKEY=... BYTEPLUS_SECRETKEY=... \
  pnpm --filter @byteplus-sdk/vod exec vitest run test/live.smoke.test.ts
```

## Development

```sh
pnpm install
pnpm run build       # tsup: CJS + ESM + d.ts for both packages
pnpm run typecheck   # per-package tsc + the example
pnpm run test        # build, then vitest (live smoke skipped without creds)
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
