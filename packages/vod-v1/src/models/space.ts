// Space-management models. Ported from the Python v1 proto.

import type { VodResponse, VodMetadataResponse } from "./common.js";

export interface CreateSpaceRequest {
  SpaceName?: string;
  ProjectName?: string;
  Description?: string;
  Region?: string;
  UserName?: string;
}
export type CreateSpaceResponse = VodMetadataResponse;

export interface VodSpaceInfo {
  SpaceName?: string;
  Region?: string;
  ProjectName?: string;
  BucketName?: string;
  BucketStatus?: string;
  Description?: string;
  UserName?: string;
  CreatedAt?: string;
  Type?: string;
  MediaSyncLevel?: string;
  CanUseArchive?: boolean;
}

export interface ListSpaceRequest {
  Offset?: number;
  Limit?: number;
  ProjectName?: string;
}
/** ListSpace Result is the space array directly (no Data wrapper). */
export type ListSpaceResponse = VodResponse<VodSpaceInfo[]>;

export interface GetSpaceDetailRequest {
  SpaceName?: string;
}
export type GetSpaceDetailResponse = VodResponse<VodSpaceInfo>;

export interface UpdateSpaceUploadConfigRequest {
  SpaceName?: string;
  ConfigKey?: string;
  ConfigValue?: string;
}
export type UpdateSpaceUploadConfigResponse = VodMetadataResponse;

export interface DescribeVodSpaceStorageDataRequest {
  SpaceList?: string;
  StartTime?: string;
  EndTime?: string;
  Aggregation?: number;
  Type?: string;
}
export interface VodStorageData {
  Time?: string;
  Storage?: number;
}
export interface VodDescribeVodSpaceStorageDataResult {
  SpaceList?: string[];
  StartTime?: string;
  EndTime?: string;
  Aggregation?: number;
  Type?: string;
  LatestStorageData?: number;
  StorageDataList?: VodStorageData[];
}
export type DescribeVodSpaceStorageDataResponse = VodResponse<VodDescribeVodSpaceStorageDataResult>;
