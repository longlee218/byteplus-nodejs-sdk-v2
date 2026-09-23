// VodEditV1 — direct-edit ops. Tier-2 (faithful-broken): these methods exist in
// the Python SDK but their Action is not registered in api_info, so each throws
// "no such api" exactly as Python ships them. Kept for surface completeness.

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";

export class VodEditV1 {
  constructor(protected readonly client: VodV1Client) {}

  submitDirectEditTaskAsync(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "SubmitDirectEditTaskAsync", req);
  }
  getDirectEditResult(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "GetDirectEditResult", req);
  }
  getDirectEditProgress(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "GetDirectEditProgress", req);
  }
}
