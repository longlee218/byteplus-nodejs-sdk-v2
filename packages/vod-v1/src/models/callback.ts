// Callback-management models. Ported from the Python v1 proto. Both ops return
// metadata only.

import type { VodMetadataResponse } from "./common.js";

export interface AddCallbackSubscriptionRequest {
  SpaceName?: string;
  Url?: string;
  ContentType?: string;
}
export type AddCallbackSubscriptionResponse = VodMetadataResponse;

export interface SetCallbackEventRequest {
  SpaceName?: string;
  Events?: string;
  AuthEnabled?: string;
  PrivateKey?: string;
}
export type SetCallbackEventResponse = VodMetadataResponse;
