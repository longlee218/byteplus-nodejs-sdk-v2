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

export {
  startExecutionMetas,
  type StartExecutionRequest,
  type StartExecutionResponse,
  type ControlForStartExecutionInput,
  type InputForStartExecutionInput,
  type OperationForStartExecutionInput,
} from "./models/start-execution.js";

export {
  getExecutionMetas,
  type GetExecutionRequest,
  type GetExecutionResponse,
  type ControlForGetExecutionOutput,
  type InputForGetExecutionOutput,
  type MetaForGetExecutionOutput,
  type OperationForGetExecutionOutput,
  type OutputForGetExecutionOutput,
} from "./models/get-execution.js";
