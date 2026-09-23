// VodWorkflowV1 — transcode / workflow ops. All GET RPC. Ports start_workflow,
// retrieve_transcode_result, get_workflow_execution.

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";
import type {
  StartWorkflowRequest,
  StartWorkflowResponse,
  RetrieveTranscodeResultRequest,
  RetrieveTranscodeResultResponse,
  GetWorkflowExecutionRequest,
  GetWorkflowExecutionResponse,
} from "../models/workflow.js";

export class VodWorkflowV1 {
  constructor(protected readonly client: VodV1Client) {}

  startWorkflow(req: StartWorkflowRequest): Promise<StartWorkflowResponse> {
    return rpcGet(this.client, "StartWorkflow", req);
  }

  retrieveTranscodeResult(req: RetrieveTranscodeResultRequest): Promise<RetrieveTranscodeResultResponse> {
    return rpcGet(this.client, "RetrieveTranscodeResult", req);
  }

  getWorkflowExecution(req: GetWorkflowExecutionRequest): Promise<GetWorkflowExecutionResponse> {
    return rpcGet(this.client, "GetWorkflowExecution", req);
  }
}
