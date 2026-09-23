// VodMeasureV1 — measure / billing data ops. All GET RPC. Ports the seven
// Describe*Data methods.

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";
import type {
  DescribeVodSpaceTranscodeDataRequest,
  DescribeVodSpaceTranscodeDataResponse,
  DescribeVodSnapshotDataRequest,
  DescribeVodSnapshotDataResponse,
  DescribeVodEnhanceImageDataRequest,
  DescribeVodEnhanceImageDataResponse,
  DescribeVodSpaceSubtitleStatisDataRequest,
  DescribeVodSpaceSubtitleStatisDataResponse,
} from "../models/measure.js";
import type {
  DescribeVodPlayedStatisDataRequest,
  DescribeVodPlayedStatisDataResponse,
  DescribeVodMostPlayedStatisDataRequest,
  DescribeVodMostPlayedStatisDataResponse,
  DescribeVodRealtimeMediaDataRequest,
  DescribeVodRealtimeMediaDataResponse,
} from "../models/measure-play.js";

export class VodMeasureV1 {
  constructor(protected readonly client: VodV1Client) {}

  describeVodSpaceTranscodeData(req: DescribeVodSpaceTranscodeDataRequest): Promise<DescribeVodSpaceTranscodeDataResponse> {
    return rpcGet(this.client, "DescribeVodSpaceTranscodeData", req);
  }
  describeVodSnapshotData(req: DescribeVodSnapshotDataRequest): Promise<DescribeVodSnapshotDataResponse> {
    return rpcGet(this.client, "DescribeVodSnapshotData", req);
  }
  describeVodEnhanceImageData(req: DescribeVodEnhanceImageDataRequest): Promise<DescribeVodEnhanceImageDataResponse> {
    return rpcGet(this.client, "DescribeVodEnhanceImageData", req);
  }
  describeVodSpaceSubtitleStatisData(req: DescribeVodSpaceSubtitleStatisDataRequest): Promise<DescribeVodSpaceSubtitleStatisDataResponse> {
    return rpcGet(this.client, "DescribeVodSpaceSubtitleStatisData", req);
  }
  describeVodPlayedStatisData(req: DescribeVodPlayedStatisDataRequest): Promise<DescribeVodPlayedStatisDataResponse> {
    return rpcGet(this.client, "DescribeVodPlayedStatisData", req);
  }
  describeVodMostPlayedStatisData(req: DescribeVodMostPlayedStatisDataRequest): Promise<DescribeVodMostPlayedStatisDataResponse> {
    return rpcGet(this.client, "DescribeVodMostPlayedStatisData", req);
  }
  describeVodRealtimeMediaData(req: DescribeVodRealtimeMediaDataRequest): Promise<DescribeVodRealtimeMediaDataResponse> {
    return rpcGet(this.client, "DescribeVodRealtimeMediaData", req);
  }
}
