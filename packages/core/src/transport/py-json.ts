// Python `json.dumps(...)`-compatible serialization: item separator ", ",
// key separator ": ", and ensure_ascii (every char outside 0x20..0x7e, plus
// " and \, escaped as \uXXXX or a short escape). This makes the JSON body the
// Node SDK signs and sends byte-identical to the Python SDK's, so signatures
// match. Input is expected pre-sanitized (no undefined/null values), matching
// the transport serializer.

const SHORT: Record<number, string> = {
  0x08: "\\b",
  0x09: "\\t",
  0x0a: "\\n",
  0x0c: "\\f",
  0x0d: "\\r",
};

function escapeString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (SHORT[c]) out += SHORT[c];
    else if (c >= 0x20 && c <= 0x7e) out += ch;
    else if (c > 0xffff) {
      // Astral char -> UTF-16 surrogate pair, each as \uXXXX (Python ensure_ascii).
      const v = c - 0x10000;
      const hi = 0xd800 + (v >> 10);
      const lo = 0xdc00 + (v & 0x3ff);
      out += "\\u" + hi.toString(16).padStart(4, "0") + "\\u" + lo.toString(16).padStart(4, "0");
    } else {
      out += "\\u" + c.toString(16).padStart(4, "0");
    }
  }
  return out + '"';
}

/** Serialize a JSON value exactly as Python `json.dumps` would (default options). */
export function pyJsonStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return escapeString(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return "[" + value.map((v) => pyJsonStringify(v)).join(", ") + "]";
  if (typeof value === "object") {
    const parts: string[] = [];
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const v = (value as Record<string, unknown>)[key];
      if (v === undefined) continue;
      parts.push(escapeString(key) + ": " + pyJsonStringify(v));
    }
    return "{" + parts.join(", ") + "}";
  }
  return "null";
}
