// Shared v1 response envelope. The wire is PascalCase (proto MessageToJson with
// preserved field names) and the Python field names are identical, so these
// interfaces mirror the wire 1:1 — this port has no attribute renaming.

export interface ResponseError {
  Code?: string;
  Message?: string;
}

export interface ResponseMetadata {
  RequestId?: string;
  Action?: string;
  Version?: string;
  Service?: string;
  Region?: string;
  Error?: ResponseError;
}

/** Every v1 response: `{ ResponseMetadata, Result }`. */
export interface VodResponse<T> {
  ResponseMetadata: ResponseMetadata;
  Result: T;
}

/** A response with only `ResponseMetadata` (no `Result`) — e.g. update ops. */
export interface VodMetadataResponse {
  ResponseMetadata: ResponseMetadata;
}
