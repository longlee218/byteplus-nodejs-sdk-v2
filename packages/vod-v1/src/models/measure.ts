// Measure / billing models (usage family: transcode, snapshot, enhance-image,
// subtitle). Ported from the Python v1 proto.

import type { VodResponse } from "./common.js";

// ---- DescribeVodSpaceTranscodeData -----------------------------------------

export interface DescribeVodSpaceTranscodeDataRequest {
  SpaceList?: string;
  StartTime?: string;
  EndTime?: string;
  TranscodeType?: string;
  Specification?: string;
  TaskStageList?: string;
  Aggregation?: number;
  DetailFieldList?: string;
}
export interface DescribeVodSpaceTranscodeItem {
  Name?: string;
  Value?: number;
}
export interface DescribeVodSpaceTranscodeDetailTVUnit {
  Time?: string;
  TranscodeItemList?: DescribeVodSpaceTranscodeItem[];
}
export interface DescribeVodSpaceTranscodeDetail {
  Space?: string;
  TaskStage?: string;
  Total?: number;
  TranscodeUsageList?: DescribeVodSpaceTranscodeDetailTVUnit[];
}
export interface DescribeVodSpaceTranscodeDataResult {
  SpaceList?: string[];
  StartTime?: string;
  EndTime?: string;
  TranscodeType?: string;
  Specification?: string;
  TaskStageList?: string[];
  Aggregation?: number;
  DetailFieldList?: string[];
  TotalTranscodeData?: number;
  TotalTranscodeDataList?: DescribeVodSpaceTranscodeItem[];
  TranscodeDataDetailList?: DescribeVodSpaceTranscodeDetail[];
}
export type DescribeVodSpaceTranscodeDataResponse = VodResponse<DescribeVodSpaceTranscodeDataResult>;

// ---- DescribeVodSnapshotData -----------------------------------------------

export interface DescribeVodSnapshotDataRequest {
  SpaceList?: string;
  StartTime?: string;
  EndTime?: string;
  SnapshotType?: string;
  TaskStageList?: string;
  Aggregation?: number;
  DetailFieldList?: string;
}
export interface DescribeVodSnapshotDataItem {
  Time?: string;
  Count?: number;
}
export interface DescribeVodSnapshotDataDetail {
  Space?: string;
  TaskStage?: string;
  Total?: string;
  SnapshotDataList?: DescribeVodSnapshotDataItem[];
}
export interface DescribeVodSnapshotDataResult {
  SpaceList?: string[];
  StartTime?: string;
  EndTime?: string;
  SnapshotType?: string;
  TaskStageList?: string[];
  Aggregation?: number;
  DetailFieldList?: string[];
  TotalSnapshotData?: number;
  SnapshotDataList?: DescribeVodSnapshotDataItem[];
  SnapshotDetailDataList?: DescribeVodSnapshotDataDetail[];
}
export type DescribeVodSnapshotDataResponse = VodResponse<DescribeVodSnapshotDataResult>;

// ---- DescribeVodEnhanceImageData -------------------------------------------

export interface DescribeVodEnhanceImageDataRequest {
  SpaceList?: string;
  StartTime?: string;
  EndTime?: string;
  TaskTypeList?: string;
  TaskStageList?: string;
  Aggregation?: number;
  RegionList?: string;
}
export interface DescribeVodEnhanceImageDataItem {
  Time?: string;
  SR?: number;
  VFI?: number;
  SDREnhance?: number;
  SDR2HDR?: number;
  AudioDenose?: number;
}
export interface DescribeVodEnhanceImageDataResult {
  SpaceList?: string[];
  StartTime?: string;
  EndTime?: string;
  TaskTypeList?: string[];
  TaskStageList?: string[];
  Aggregation?: number;
  RegionList?: string[];
  TotalEnhanceImagData?: number;
  EnhanceImageList?: DescribeVodEnhanceImageDataItem[];
}
export type DescribeVodEnhanceImageDataResponse = VodResponse<DescribeVodEnhanceImageDataResult>;

// ---- DescribeVodSpaceSubtitleStatisData ------------------------------------

export interface DescribeVodSpaceSubtitleStatisDataRequest {
  SpaceList?: string;
  StartTime?: string;
  EndTime?: string;
  SubtitleType?: string;
  TaskStageList?: string;
  Aggregation?: number;
  DetailFieldList?: string;
}
export interface DescribeVodSpaceSubtitleStatisDataItem {
  Time?: string;
  Usage?: number;
}
export interface DescribeVodSpaceSubtitleStatisDataDetail {
  Space?: string;
  TaskStage?: string;
  SubtitleUsageDataList?: DescribeVodSpaceSubtitleStatisDataItem[];
}
export interface DescribeVodSpaceSubtitleStatisDataResult {
  SpaceList?: string[];
  StartTime?: string;
  EndTime?: string;
  SubtitleType?: string;
  TaskStageList?: string[];
  Aggregation?: number;
  DetailFieldList?: string[];
  TotalSubtitleUsageData?: number;
  SubtitleUsageDataList?: DescribeVodSpaceSubtitleStatisDataItem[];
  SubtitleUsageDataDetailList?: DescribeVodSpaceSubtitleStatisDataDetail[];
}
export type DescribeVodSpaceSubtitleStatisDataResponse = VodResponse<DescribeVodSpaceSubtitleStatisDataResult>;
