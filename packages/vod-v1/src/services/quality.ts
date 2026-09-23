// VodQualityV1 — quality-platform op. POST JSON. Ports get_vod_media_play_data.

import type { VodV1Client } from "../client.js";
import { rpcPostJson } from "./rpc.js";
import type { GetVodMediaPlayDataRequest, GetVodMediaPlayDataResponse } from "../models/quality.js";

export class VodQualityV1 {
  constructor(protected readonly client: VodV1Client) {}

  getVodMediaPlayData(req: GetVodMediaPlayDataRequest): Promise<GetVodMediaPlayDataResponse> {
    return rpcPostJson(this.client, "GetVodMediaPlayData", req);
  }
}
