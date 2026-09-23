// Error contract — faithful to the Python v1 wrappers, which on an HTTP error
// parse the error body and `raise Exception(ResponseMetadata.Error.Code)`. The
// port raises `VodV1ApiError` whose `message` is that code, while also carrying
// the status/body/code for programmatic handling.

import { ApiException } from "@byteplus-sdk/core";

export class VodV1ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly body?: string;

  constructor(code: string, statusCode: number, body?: string) {
    super(code);
    this.name = "VodV1ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Convert a transport error into the Python-faithful error: on an
 * `ApiException` whose body carries `ResponseMetadata.Error.Code`, return a
 * `VodV1ApiError` (message = code); otherwise return the original error
 * (Python re-raises the raw text when the body cannot be parsed).
 */
export function toVodError(err: unknown): unknown {
  if (!(err instanceof ApiException) || err.body === undefined) return err;
  try {
    const data = JSON.parse(err.body) as { ResponseMetadata?: { Error?: { Code?: string } } };
    const code = data.ResponseMetadata?.Error?.Code;
    if (code) return new VodV1ApiError(code, err.status, err.body);
  } catch {
    /* not JSON → fall through to the original error */
  }
  return err;
}
