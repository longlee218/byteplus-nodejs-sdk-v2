// @byteplus-sdk/vod-v1 — BytePlus VOD service v1 (Action+Version OpenAPI).
// This slice (US-011) ships the dispatch core only; operation methods land in
// US-012+ on top of `VodV1Client`.

/** Package identity marker, mirroring the other packages. */
export const VOD_V1_PACKAGE = "@byteplus-sdk/vod-v1";

export { VodV1 } from "./vod-v1.js";
export { VodV1Client, type VodV1Options } from "./client.js";
export { VodPlaybackV1 } from "./services/playback.js";
export { VodDrmV1 } from "./services/drm.js";
export { VodUploadV1 } from "./services/upload.js";
export {
  crc32Hex,
  MIN_CHUNK_SIZE,
  defaultTosPut,
  type TosPutClient,
  type TosPutRequest,
  type TosPutResponse,
  type TransferOpts,
} from "./services/tos-transport.js";
export * from "./models/common.js";
export * from "./models/business.js";
export * from "./models/playback.js";
export * from "./models/drm.js";
export * from "./models/upload.js";
export { VodMediaV1 } from "./services/media.js";
export * from "./models/media.js";
export * from "./models/subtitle.js";
export * from "./models/playlist.js";
export * from "./models/file.js";
export { VodWorkflowV1 } from "./services/workflow.js";
export * from "./models/workflow.js";
export { VodSpaceV1 } from "./services/space.js";
export * from "./models/space.js";
export { VodCdnV1 } from "./services/cdn.js";
export * from "./models/cdn.js";
export * from "./models/cdn-data.js";
export { VodCallbackV1 } from "./services/callback.js";
export * from "./models/callback.js";
export { VodMeasureV1 } from "./services/measure.js";
export * from "./models/measure.js";
export * from "./models/measure-play.js";
export { VodQualityV1 } from "./services/quality.js";
export * from "./models/quality.js";
export { VodEditV1 } from "./services/edit.js";
export {
  VOD_V1_API_INFO,
  VOD_V1_OP_COUNT,
  type V1ApiEntry,
  type V1Dispatch,
} from "./api-info.js";
export {
  V1_HOSTS,
  VOD_V1_SERVICE,
  VOD_V1_DEFAULT_REGION,
  resolveV1Host,
} from "./service-config.js";
export { serializeParams } from "./params.js";
