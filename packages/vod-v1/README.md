# @byteplus-sdk/vod-v1

BytePlus **VOD service v1** client for the Node.js SDK — a TypeScript port of the
Python `byteplus-sdk` VOD service (`byteplus_sdk/vod`, v1.0.60), wire-identical
to the source. This is the classic OpenAPI **`Action`+`Version` query** service,
distinct from [`@byteplus-sdk/vod`](../vod) (the v2 resource-path service). Both
reuse [`@byteplus-sdk/core`](../core)'s SignatureV4 signer + transport.

## Install

```sh
npm install @byteplus-sdk/vod-v1 @byteplus-sdk/core
```

## Quick start

```ts
import { DefaultCredentialProvider } from "@byteplus-sdk/core";
import { VodV1 } from "@byteplus-sdk/vod-v1";

const vod = new VodV1({
  region: process.env.BYTEPLUS_REGION ?? "ap-singapore-1", // or ap-southeast-1
  credentialProvider: new DefaultCredentialProvider(),      // env / CLI / ECS order
});

// Media
const info = await vod.media.getMediaInfos({ Vids: "vid-1,vid-2" });

// Upload a local file (ApplyUploadInfo → TOS transfer → CommitUploadInfo)
const commit = await vod.upload.uploadMedia({ SpaceName: "my-space", FilePath: "./clip.mp4" });

// Playback + a signed play-auth token for a player
const token = new VodV1({ ak: process.env.AK!, sk: process.env.SK! })
  .playback.getPlayAuthToken({ Vid: "vid-1" }, 3600);
```

## Surface

The `VodV1` facade groups the ~60 operations by category:

| Namespace | Ops |
|---|---|
| `vod.playback` | GetPlayInfo, GetPrivateDrmPlayAuth, Create/GetHlsDecryptionKey + play-auth/HLS-DRM token builders |
| `vod.drm` | third-party DRM auth token, FairPlay cert URL |
| `vod.upload` | ApplyUploadInfo, CommitUploadInfo, QueryUploadTaskInfo, UploadMediaByUrl, ParseUploadManifest + `uploadMedia`/`uploadTob` TOS transport |
| `vod.media` | media info/list/update/delete, subtitles (+ auth token), classifications, playlists, TOS files |
| `vod.workflow` | StartWorkflow, RetrieveTranscodeResult, GetWorkflowExecution |
| `vod.space` | CreateSpace, ListSpace, GetSpaceDetail, UpdateSpaceUploadConfig, DescribeVodSpaceStorageData |
| `vod.cdn` | domains, refresh/preload tasks, access logs, top-access, bandwidth/traffic/usage/status/pv, IP info |
| `vod.callback` | AddCallbackSubscription, SetCallbackEvent |
| `vod.measure` | 7 `Describe*Data` billing/statistics ops |
| `vod.quality` | GetVodMediaPlayData |

`vod.edit` and a few methods on `playback`/`media`/`cdn` mirror the Python SDK's
**unwired** methods; like the Python source, they throw `no such api` (they are
not registered server-side). See `docs/product/reference-byteplus-python-sdk-v1/`.

## Fidelity

Request signing, query/body serialization (Python `json.dumps` spacing via
`pyJsonStringify`), the `ListCdnTasks → ListCDNTasks` Action rename, per-op
`Version`, and the direct-to-TOS upload protocol are all verified byte-identical
to the Python SDK. One documented deviation: proto `double` request fields (only
`ListSpace` Offset/Limit) serialize as `"10"` vs Python `"10.0"`.
