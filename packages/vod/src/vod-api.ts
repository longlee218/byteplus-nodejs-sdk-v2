// VodApi — the vod20250701 service client. Two operations wired to the core
// ApiClient; signing and HTTP live in @byteplus-sdk/core.

import { ApiClient, Configuration } from "@byteplus-sdk/core";
import { registerVodModels } from "./models/register.js";
import type {
  StartExecutionRequest,
  StartExecutionResponse,
} from "./models/start-execution.js";
import type {
  GetExecutionRequest,
  GetExecutionResponse,
} from "./models/get-execution.js";

/** BytePlus VOD service (vod20250701): StartExecution + GetExecution. */
export class VodApi {
  private readonly client: ApiClient;

  /**
   * Construct from a `Configuration` (a fresh `ApiClient` is built and the VOD
   * metas are registered into the configuration's registry) or from an existing
   * `ApiClient` (whose registry must already carry the VOD metas — the package
   * registers them into the shared `defaultRegistry` on import).
   */
  constructor(source: Configuration | ApiClient) {
    if (source instanceof ApiClient) {
      this.client = source;
    } else {
      registerVodModels(source.registry);
      this.client = new ApiClient(source);
    }
  }

  startExecution(body: StartExecutionRequest): Promise<StartExecutionResponse> {
    return this.client.callApi<StartExecutionResponse>({
      resourcePath: "/StartExecution/2025-07-01/vod/post/application_json/",
      method: "POST",
      headerParams: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      requestType: "StartExecutionRequest",
      responseType: "StartExecutionResponse",
      authSettings: ["byteplusSign"],
    });
  }

  getExecution(body: GetExecutionRequest): Promise<GetExecutionResponse> {
    if (body === undefined || body === null || body.runId === undefined || body.runId === null) {
      throw new Error("getExecution requires `runId`");
    }
    return this.client.callApi<GetExecutionResponse>({
      resourcePath: "/GetExecution/2025-07-01/vod/get/text_plain/",
      method: "GET",
      headerParams: { "Content-Type": "text/plain", Accept: "application/json" },
      body,
      requestType: "GetExecutionRequest",
      responseType: "GetExecutionResponse",
      authSettings: ["byteplusSign"],
    });
  }
}
