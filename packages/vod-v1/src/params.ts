// Request-param serialization — port of the block every v1 VOD wrapper runs:
//
//   params = json.loads(MessageToJson(request, False, True))
//   for k, v in params.items():
//       if isinstance(v, (int, float, bool, str)): continue   # scalar: keep
//       else: params[k] = json.dumps(v)                       # nested -> JSON string
//
// then base `prepare_request` renders the query with Python `str()` on scalars.
// The net wire rule: top-level scalars are stringified with Python `str()`
// semantics; every nested object/array becomes a Python-`json.dumps` string
// (spacing "= ", "= " matters — it is signed). We reuse core's `pyJsonStringify`
// for the nested case so the bytes match the Python SDK.

import { pyJsonStringify } from "@byteplus-sdk/core";

/**
 * Serialize a v1 request param object to the flat `Record<string,string>` that
 * goes into the query (GET) or x-www-form-urlencoded body (POST form). Nested
 * objects/arrays are Python-`json.dumps`-encoded; scalars use Python `str()`.
 * `undefined`/`null` entries are dropped (they are not sent).
 */
export function serializeParams(params: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    out[key] = stringifyScalarOrJson(value);
  }
  return out;
}

function stringifyScalarOrJson(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return String(value);
    case "boolean":
      // Python `str(True)` -> "True" (a top-level bool param reaches urlencode as
      // Python's str(), not JSON). Nested bools go through pyJsonStringify below.
      return value ? "True" : "False";
    default:
      // object / array -> Python json.dumps string (byte-identical spacing).
      return pyJsonStringify(value);
  }
}
