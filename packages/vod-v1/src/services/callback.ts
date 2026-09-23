// VodCallbackV1 — callback subscription ops. GET RPC. Ports
// add_callback_subscription, set_callback_event.

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";
import type {
  AddCallbackSubscriptionRequest,
  AddCallbackSubscriptionResponse,
  SetCallbackEventRequest,
  SetCallbackEventResponse,
} from "../models/callback.js";

export class VodCallbackV1 {
  constructor(protected readonly client: VodV1Client) {}

  addCallbackSubscription(req: AddCallbackSubscriptionRequest): Promise<AddCallbackSubscriptionResponse> {
    return rpcGet(this.client, "AddCallbackSubscription", req);
  }

  setCallbackEvent(req: SetCallbackEventRequest): Promise<SetCallbackEventResponse> {
    return rpcGet(this.client, "SetCallbackEvent", req);
  }
}
