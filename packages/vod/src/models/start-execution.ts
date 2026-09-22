// VOD StartExecution models (vod20250701). Mirrors the Python
// `StartExecutionRequest`/`StartExecutionResponse` model pair.
// Source pattern: docs/product/reference-byteplus-python-sdk/service-module-pattern.md.

import type { ModelMeta } from "@byteplus-sdk/core";

// Nested workflow-definition containers. Their sub-schema is defined by the VOD
// OpenAPI spec and is not ported in US-005 (only the two operations' top-level
// models ship). They pass through the serializer verbatim (see the metas below:
// their type names are intentionally left unregistered).
export type ControlForStartExecutionInput = Record<string, unknown>;
export type InputForStartExecutionInput = Record<string, unknown>;
export type OperationForStartExecutionInput = Record<string, unknown>;

/** Body of `POST /StartExecution/2025-07-01/vod/post/application_json/`. */
export interface StartExecutionRequest {
  control?: ControlForStartExecutionInput;
  input?: InputForStartExecutionInput;
  operation?: OperationForStartExecutionInput;
}

/** Result of `StartExecution`. */
export interface StartExecutionResponse {
  runId?: string;
}

export const startExecutionMetas: Record<string, ModelMeta> = {
  StartExecutionRequest: {
    attributeMap: { control: "Control", input: "Input", operation: "Operation" },
    swaggerTypes: {
      control: "ControlForStartExecutionInput",
      input: "InputForStartExecutionInput",
      operation: "OperationForStartExecutionInput",
    },
  },
  StartExecutionResponse: {
    attributeMap: { runId: "RunId" },
    swaggerTypes: { runId: "str" },
  },
};
