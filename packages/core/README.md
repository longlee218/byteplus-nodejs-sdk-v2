# @byteplus-sdk/core

Core engine for the BytePlus Node.js SDK v2 — request signing (BytePlus
SignatureV4), credential providers, and the HTTP transport pipeline. Service
packages such as [`@byteplus-sdk/vod`](https://www.npmjs.com/package/@byteplus-sdk/vod)
build on top of it.

## Install

```sh
npm install @byteplus-sdk/core
```

Requires Node.js >= 18 (uses the global `fetch`).

## What it provides

- **Signing** — `signV4` / `signUrl` produce wire-identical BytePlus
  SignatureV4 output.
- **Credentials** — `StaticCredentialProvider`, `EnvironmentVariableCredentialProvider`,
  `CLIConfigCredentialProvider`, `DefaultCredentialProvider`, and STS/ECS
  providers.
- **Transport** — `Configuration`, `ApiClient`, `ModelRegistry`, retry, and an
  injectable `HttpClient` so the whole pipeline is testable offline.

## Minimal usage

```ts
import {
  Configuration,
  DefaultCredentialProvider,
} from "@byteplus-sdk/core";

const config = new Configuration({
  region: "ap-southeast-1",
  credentialProvider: new DefaultCredentialProvider(), // reads env / CLI / ECS
});
```

Credentials are read from the environment; never hard-code them. See
`BYTEPLUS_ACCESSKEY` / `BYTEPLUS_SECRETKEY`.

## License

Apache-2.0. See [LICENSE](./LICENSE).
