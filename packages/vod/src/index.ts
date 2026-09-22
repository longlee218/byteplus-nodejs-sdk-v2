// @byteplus-sdk/vod — VOD service surface (vod20250701).

import { CORE_PACKAGE, defaultRegistry } from "@byteplus-sdk/core";
import { registerVodModels } from "./models/register.js";

// Register VOD model metadata into the shared default registry on import, so a
// VodApi built from an externally constructed ApiClient (which uses
// defaultRegistry) can serialize/deserialize without extra wiring.
registerVodModels(defaultRegistry);

/** Package identity marker. */
export const VOD_PACKAGE = "@byteplus-sdk/vod";

/** Proves the cross-package dependency on core resolves at build/runtime. */
export function coreDependency(): string {
  return CORE_PACKAGE;
}

export { VodApi } from "./vod-api.js";
export { registerVodModels } from "./models/register.js";

// All VOD model interfaces (StartExecution input tree + GetExecution output
// tree + the four request/response wrappers) and their registered metas.
export * from "./models/start-execution.js";
export * from "./models/get-execution.js";
export { startExecutionMetas } from "./models/start-execution-metas.js";
export { getExecutionMetas } from "./models/get-execution-metas.js";
