// @byteplus-sdk/vod-v1 — BytePlus VOD service v1 (Action+Version OpenAPI).
// This slice (US-011) ships the dispatch core only; operation methods land in
// US-012+ on top of `VodV1Client`.

/** Package identity marker, mirroring the other packages. */
export const VOD_V1_PACKAGE = "@byteplus-sdk/vod-v1";

export { VodV1Client, type VodV1Options } from "./client.js";
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
