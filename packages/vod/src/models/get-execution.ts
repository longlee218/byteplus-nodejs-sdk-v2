// VOD GetExecution models (vod20250701). Mirrors the Python
// `GetExecutionRequest`/`GetExecutionResponse` model pair.
// Source pattern: docs/product/reference-byteplus-python-sdk/service-module-pattern.md.

import type { ModelMeta } from "@byteplus-sdk/core";

// Nested output containers — passthrough, same rationale as start-execution.ts.
export type ControlForGetExecutionOutput = Record<string, unknown>;
export type InputForGetExecutionOutput = Record<string, unknown>;
export type MetaForGetExecutionOutput = Record<string, unknown>;
export type OperationForGetExecutionOutput = Record<string, unknown>;
export type OutputForGetExecutionOutput = Record<string, unknown>;

/** Body of `GET /GetExecution/2025-07-01/vod/get/text_plain/`. `runId` required. */
export interface GetExecutionRequest {
  /** Required. Execution run id (wire key `RunId`). */
  runId: string;
}

/** Result of `GetExecution`. */
export interface GetExecutionResponse {
  code?: string;
  control?: ControlForGetExecutionOutput;
  input?: InputForGetExecutionOutput;
  meta?: MetaForGetExecutionOutput;
  operation?: OperationForGetExecutionOutput;
  output?: OutputForGetExecutionOutput;
  runId?: string;
  status?: string;
}

export const getExecutionMetas: Record<string, ModelMeta> = {
  GetExecutionRequest: {
    attributeMap: { runId: "RunId" },
    swaggerTypes: { runId: "str" },
  },
  GetExecutionResponse: {
    attributeMap: {
      code: "Code",
      control: "Control",
      input: "Input",
      meta: "Meta",
      operation: "Operation",
      output: "Output",
      runId: "RunId",
      status: "Status",
    },
    swaggerTypes: {
      code: "str",
      control: "ControlForGetExecutionOutput",
      input: "InputForGetExecutionOutput",
      meta: "MetaForGetExecutionOutput",
      operation: "OperationForGetExecutionOutput",
      output: "OutputForGetExecutionOutput",
      runId: "str",
      status: "str",
    },
  },
};
