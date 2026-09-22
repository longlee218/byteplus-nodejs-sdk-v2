// Model metadata registry: bridges idiomatic (camelCase) model fields and the
// BytePlus wire keys (PascalCase), mirroring the Python attribute_map /
// swagger_types. Keyed by type name (the Python `response_type` string).

export interface ModelMeta {
  /** model attr -> wire JSON key, e.g. { runId: "RunId" }. */
  attributeMap: Record<string, string>;
  /** model attr -> type string: a primitive ("str") or another model name, or "list[Name]". */
  swaggerTypes: Record<string, string>;
}

export class ModelRegistry {
  private readonly metas = new Map<string, ModelMeta>();

  register(name: string, meta: ModelMeta): void {
    this.metas.set(name, meta);
  }
  get(name: string): ModelMeta | undefined {
    return this.metas.get(name);
  }
  has(name: string): boolean {
    return this.metas.has(name);
  }
}

/** Shared default registry; service packages (e.g. vod, US-005) register into it. */
export const defaultRegistry = new ModelRegistry();

function listInner(type: string): string | undefined {
  return type.startsWith("list[") && type.endsWith("]") ? type.slice(5, -1) : undefined;
}

function serializeValue(value: unknown, type: string, reg: ModelRegistry): unknown {
  const inner = listInner(type);
  if (inner !== undefined && Array.isArray(value)) return value.map((v) => serializeValue(v, inner, reg));
  const meta = reg.get(type);
  if (meta && value && typeof value === "object") return serializeModel(value as Record<string, unknown>, meta, reg);
  return value;
}

/** Model object -> wire object (rename via attributeMap, drop undefined). */
export function serializeModel(value: Record<string, unknown>, meta: ModelMeta, reg: ModelRegistry): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const attr of Object.keys(meta.swaggerTypes)) {
    const v = value[attr];
    if (v === undefined || v === null) continue;
    const wireKey = meta.attributeMap[attr] ?? attr;
    out[wireKey] = serializeValue(v, meta.swaggerTypes[attr] as string, reg);
  }
  return out;
}

function deserializeValue(value: unknown, type: string, reg: ModelRegistry): unknown {
  const inner = listInner(type);
  if (inner !== undefined && Array.isArray(value)) return value.map((v) => deserializeValue(v, inner, reg));
  const meta = reg.get(type);
  if (meta && value && typeof value === "object") return deserializeModel(value as Record<string, unknown>, meta, reg);
  return value;
}

/** Wire object -> model object (reverse rename). */
export function deserializeModel(data: Record<string, unknown>, meta: ModelMeta, reg: ModelRegistry): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const attr of Object.keys(meta.swaggerTypes)) {
    const wireKey = meta.attributeMap[attr] ?? attr;
    const v = data[wireKey];
    if (v === undefined) continue;
    out[attr] = deserializeValue(v, meta.swaggerTypes[attr] as string, reg);
  }
  return out;
}

/** Serialize a body by type name; falls back to the value itself when unknown. */
export function serializeByType(value: unknown, type: string | undefined, reg: ModelRegistry): unknown {
  if (type && reg.has(type) && value && typeof value === "object") {
    return serializeModel(value as Record<string, unknown>, reg.get(type) as ModelMeta, reg);
  }
  return value;
}

/** Deserialize a payload by type name; falls back to the raw data when unknown. */
export function deserializeByType(data: unknown, type: string | undefined, reg: ModelRegistry): unknown {
  if (type && reg.has(type) && data && typeof data === "object") {
    return deserializeModel(data as Record<string, unknown>, reg.get(type) as ModelMeta, reg);
  }
  return data;
}
