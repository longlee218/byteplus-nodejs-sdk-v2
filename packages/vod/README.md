# @byteplus-sdk/vod

BytePlus VOD service client (`vod20250701`) for the Node.js SDK v2. Wraps the
[`@byteplus-sdk/core`](https://www.npmjs.com/package/@byteplus-sdk/core)
transport with the `StartExecution` and `GetExecution` operations.

## Install

```sh
npm install @byteplus-sdk/vod @byteplus-sdk/core
```

Requires Node.js >= 18.

## Usage

```ts
import { Configuration, DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodApi } from "@byteplus-sdk/vod";

const config = new Configuration({
  region: "ap-southeast-1",
  credentialProvider: new DefaultCredentialProvider(), // reads env credentials
});
const api = new VodApi(config);

const started = await api.startExecution({ /* input: { ... } */ });
const execution = await api.getExecution({ runId: started.runId! });
```

Set credentials in the environment (never in source):

```sh
export BYTEPLUS_ACCESSKEY=...
export BYTEPLUS_SECRETKEY=...
export BYTEPLUS_REGION=ap-southeast-1   # optional; this is the default
```

A full runnable example lives at
[`examples/vod-execution.ts`](https://github.com/byteplus-sdk/byteplus-node-sdk-v2/blob/main/examples/vod-execution.ts).

## License

Apache-2.0. See [LICENSE](./LICENSE).
