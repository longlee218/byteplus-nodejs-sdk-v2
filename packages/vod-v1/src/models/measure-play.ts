// Measure / billing models (play + realtime family: played, most-played,
// realtime media). Ported from the Python v1 proto.

import type { VodResponse } from "./common.js";

// ---- DescribeVodPlayedStatisData -------------------------------------------

export interface DescribeVodPlayedStatisDataRequest {
  Space?: string;
  StartTime?: string;
  EndTime?: string;
  VidList?: string;
  OrderType?: string;
}
export interface DescribeVodPlayedStatisDataItem {
  Vid?: string;
  Name?: string;
  Size?: number;
  Duration?: number;
  CreateTime?: string;
  PlayCount?: number;
  Traffic?: number;
}
export interface DescribeVodPlayedStatisDataResult {
  Space?: string;
  StartTime?: string;
  EndTime?: string;
  VidList?: string[];
  OrderType?: string;
  PlayStatInfos?: DescribeVodPlayedStatisDataItem[];
}
export type DescribeVodPlayedStatisDataResponse = VodResponse<DescribeVodPlayedStatisDataResult>;

// ---- DescribeVodMostPlayedStatisData ---------------------------------------

export interface DescribeVodMostPlayedStatisDataRequest {
  Space?: string;
  StartTime?: string;
  EndTime?: string;
  OrderType?: string;
  TopN?: number;
}
export interface DescribeVodMostPlayedStatisDataItem {
  Vid?: string;
  Name?: string;
  Size?: number;
  Duration?: number;
  CreateTime?: string;
  PlayCount?: number;
  Traffic?: number;
}
export interface DescribeVodMostPlayedStatisDataResult {
  Space?: string;
  StartTime?: string;
  EndTime?: string;
  OrderType?: string;
  TopN?: number;
  PlayStatInfos?: DescribeVodMostPlayedStatisDataItem[];
}
export type DescribeVodMostPlayedStatisDataResponse = VodResponse<DescribeVodMostPlayedStatisDataResult>;

// ---- DescribeVodRealtimeMediaData ------------------------------------------

export interface DescribeVodRealtimeMediaDataRequest {
  SpaceList?: string;
  StartTime?: string;
  EndTime?: string;
  ProcessType?: string;
  Aggregation?: number;
  DetailFieldList?: string;
}
export interface DescribeVodRealtimeMediaDataItem {
  Time?: string;
  Count?: number;
}
export interface DescribeVodRealtimeMediaDataDetail {
  Space?: string;
  Total?: number;
  RealtimeMediaDataList?: DescribeVodRealtimeMediaDataItem[];
}
export interface DescribeVodRealtimeMediaDataResult {
  SpaceList?: string[];
  StartTime?: string;
  EndTime?: string;
  ProcessType?: string;
  Aggregation?: number;
  DetailFieldList?: string[];
  TotalRealtimeMediaData?: number;
  RealtimeMediaDataList?: DescribeVodRealtimeMediaDataItem[];
  RealtimeMediaDetailDataList?: DescribeVodRealtimeMediaDataDetail[];
}
export type DescribeVodRealtimeMediaDataResponse = VodResponse<DescribeVodRealtimeMediaDataResult>;
