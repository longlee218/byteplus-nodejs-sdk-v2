// Registers every VOD model's ModelMeta into a ModelRegistry so the core
// serializer/deserializer can rename fields snake<->Pascal by type name.

import type { ModelRegistry } from "@byteplus-sdk/core";
import { startExecutionMetas } from "./start-execution.js";
import { getExecutionMetas } from "./get-execution.js";

const vodMetas = { ...startExecutionMetas, ...getExecutionMetas };

/** Idempotently register the VOD model metas into `registry`. */
export function registerVodModels(registry: ModelRegistry): void {
  for (const [name, meta] of Object.entries(vodMetas)) {
    if (!registry.has(name)) registry.register(name, meta);
  }
}
