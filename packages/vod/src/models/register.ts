// Registers every VOD model's ModelMeta into a ModelRegistry so the core
// serializer/deserializer can rename fields camelCase<->PascalCase by type name,
// recursing into nested models and list[...] at every depth (decision 0100).

import type { ModelRegistry } from "@byteplus-sdk/core";
import { startExecutionMetas } from "./start-execution-metas.js";
import { getExecutionMetas } from "./get-execution-metas.js";

const vodMetas = { ...startExecutionMetas, ...getExecutionMetas };

/** Idempotently register the VOD model metas into `registry`. */
export function registerVodModels(registry: ModelRegistry): void {
  for (const [name, meta] of Object.entries(vodMetas)) {
    if (!registry.has(name)) registry.register(name, meta);
  }
}
