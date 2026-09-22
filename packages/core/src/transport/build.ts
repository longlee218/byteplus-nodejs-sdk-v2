import { serializeByType } from "./registry.js";
import type { ModelRegistry } from "./registry.js";
import { pyJsonStringify } from "./py-json.js";

export interface ParsedPath {
  action: string;
  version: string;
  service: string;
}

/** Parse `/{Action}/{Version}/{service}/{verb}/{hint}/` (Python indices 1,2,3). */
export function parseResourcePath(resourcePath: string): ParsedPath {
  const parts = resourcePath.split("/");
  return { action: parts[1] ?? "", version: parts[2] ?? "", service: parts[3] ?? "" };
}

/**
 * Flatten a nested object/array into dotted, 1-based-indexed query keys
 * (`key.1.subkey`), booleans lowercased, null/undefined skipped. Mirrors the
 * Python `__req_to_params`.
 */
export function reqToParams(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (prefix: string, v: unknown): void => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(prefix ? `${prefix}.${i + 1}` : String(i + 1), item));
    } else if (typeof v === "object") {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        walk(prefix ? `${prefix}.${k}` : k, (v as Record<string, unknown>)[k]);
      }
    } else {
      out[prefix] = String(v); // booleans stringify to "true"/"false"
    }
  };
  walk("", value);
  return out;
}

export interface BuiltRequest {
  service: string;
  method: string;
  truePath: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string;
}

export interface BuildInput {
  resourcePath: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
  requestType?: string;
}

/**
 * Build the request: wire the Action/Version query params, set the signing
 * service, serialize the body (attributeMap rename), and flatten to the query
 * for GET + text/plain. The real HTTP path is always `/`.
 */
export function buildRequest(input: BuildInput, registry: ModelRegistry): BuiltRequest {
  const { action, version, service } = parseResourcePath(input.resourcePath);
  const query: Record<string, string> = { ...input.query, Action: action, Version: version };
  const headers = { ...input.headers };

  let body = "";
  if (input.body !== undefined && input.body !== null) {
    const wire = serializeByType(input.body, input.requestType, registry);
    if (input.method === "GET") {
      // A GET never carries a body (BytePlus uses text/plain GETs whose body is
      // flattened onto the query). Always flatten so the signed body ("") and
      // the sent body cannot diverge — an HTTP client drops GET bodies.
      Object.assign(query, reqToParams(wire));
    } else {
      // Python-json.dumps-compatible bytes (spaces + ensure_ascii) so the signed
      // and sent body is byte-identical to the Python SDK's, and the signature
      // matches (proven by the US-008 differential goldens).
      body = pyJsonStringify(wire);
    }
  }

  return { service, method: input.method, truePath: "/", headers, query, body };
}
