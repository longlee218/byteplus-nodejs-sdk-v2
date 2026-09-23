// Shared RPC helpers: sign + send via the dispatch client, then parse the full
// typed `{ ResponseMetadata, Result }`. Business errors (200 body with
// Error.Code) pass through to the caller, matching the Python wrappers.

import type { VodV1Client } from "../client.js";
import { toVodError } from "../errors.js";

/** GET dispatch → typed response. On HTTP error, raises the API Error.Code (Python parity). */
export async function rpcGet<T>(client: VodV1Client, action: string, req: object): Promise<T> {
  try {
    return JSON.parse(await client.get(action, req as Record<string, unknown>)) as T;
  } catch (err) {
    throw toVodError(err);
  }
}

/** POST x-www-form-urlencoded dispatch (request fields in the form body) → typed response. */
export async function rpcPostForm<T>(client: VodV1Client, action: string, req: object): Promise<T> {
  try {
    return JSON.parse(await client.post(action, undefined, req as Record<string, unknown>)) as T;
  } catch (err) {
    throw toVodError(err);
  }
}

/**
 * POST JSON dispatch (the whole request as the JSON body; Action+Version in
 * query). The body is signed, so it uses Python-`json.dumps` spacing.
 */
export async function rpcPostJson<T>(client: VodV1Client, action: string, req: unknown): Promise<T> {
  try {
    return JSON.parse(await client.json(action, undefined, req)) as T;
  } catch (err) {
    throw toVodError(err);
  }
}
