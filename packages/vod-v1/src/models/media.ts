// Media-management models (media A: info/list/update/delete). Ported from the
// Python v1 proto. Protobuf wrapper fields (StringValue/Int64Value) serialize
// to bare scalars on the wire, so they are modeled as plain optionals.

import type { VodResponse, VodMetadataResponse } from "./common.js";
import type { VodSourceInfo, VodVideoStreamMeta, VodAudioStreamMeta } from "./business.js";

// ---- shared media types ----------------------------------------------------

export interface VodClassification {
  SpaceName?: string;
  ClassificationId?: number;
  Level?: number;
  Classification?: string;
  ParentClassificationId?: number;
  SubClassification?: VodClassification;
  SubClassificationTrees?: VodClassification[];
  CreatedAt?: string;
}

export interface VodMediaBasicInfo {
  SpaceName?: string;
  Vid?: string;
  Title?: string;
  Description?: string;
  PosterUri?: string;
  PublishStatus?: string;
  Tags?: string[];
  CreateTime?: string;
  Classification?: VodClassification;
  TosStorageClass?: string;
  VodUploadSource?: string;
}

export interface VodTranscodeInfo {
  FileId?: string;
  Md5?: string;
  FileType?: string;
  LogoType?: string;
  Encrypt?: boolean;
  Format?: string;
  Duration?: number;
  Size?: number;
  StoreUri?: string;
  VideoStreamMeta?: VodVideoStreamMeta;
  AudioStreamMeta?: VodAudioStreamMeta;
  CreateTime?: string;
  DynamicRange?: string;
  TosStorageClass?: string;
}

export interface VodMediaSmartInfo {
  SpaceName?: string;
  Vid?: string;
  SmartTags?: string[];
}

export interface VodMediaInfo {
  BasicInfo?: VodMediaBasicInfo;
  SourceInfo?: VodSourceInfo;
  TranscodeInfos?: VodTranscodeInfo[];
  SmartInfo?: VodMediaSmartInfo;
}

// ---- UpdateMediaInfo / UpdateMediaPublishStatus (metadata-only responses) ---

export interface UpdateMediaInfoRequest {
  Vid?: string;
  PosterUri?: string;
  Title?: string;
  Description?: string;
  Tags?: string;
  ClassificationId?: number;
}
export type UpdateMediaInfoResponse = VodMetadataResponse;

export interface UpdateMediaPublishStatusRequest {
  Vid?: string;
  Status?: string;
}
export type UpdateMediaPublishStatusResponse = VodMetadataResponse;

// ---- GetMediaInfos ---------------------------------------------------------

export interface GetMediaInfosRequest {
  Vids?: string;
  NeedSmartInfo?: boolean;
}
export interface VodGetMediaInfosData {
  MediaInfoList?: VodMediaInfo[];
  NotExistVids?: string[];
}
export type GetMediaInfosResponse = VodResponse<VodGetMediaInfosData>;

// ---- GetMediaList ----------------------------------------------------------

export interface GetMediaListRequest {
  SpaceName?: string;
  Vid?: string;
  Status?: string;
  Order?: string;
  Tags?: string;
  StartTime?: string;
  EndTime?: string;
  Offset?: string;
  PageSize?: string;
  ClassificationIds?: string;
  TosStorageClasses?: string;
  VodUploadSources?: string;
  SmartTags?: string;
}
export interface VodGetMediaListData {
  SpaceName?: string;
  MediaInfoList?: VodMediaInfo[];
  TotalCount?: number;
  Offset?: number;
  PageSize?: number;
}
export type GetMediaListResponse = VodResponse<VodGetMediaListData>;

// ---- DeleteMedia / DeleteTranscodes ----------------------------------------

export interface DeleteMediaRequest {
  Vids?: string;
  CallbackArgs?: string;
}
export interface VodDeleteMediaData {
  NotExistVids?: string[];
}
export type DeleteMediaResponse = VodResponse<VodDeleteMediaData>;

export interface DeleteTranscodesRequest {
  Vid?: string;
  FileIds?: string;
  CallbackArgs?: string;
}
export interface VodDeleteTranscodesData {
  NotExistFileIds?: string[];
}
export type DeleteTranscodesResponse = VodResponse<VodDeleteTranscodesData>;

// ---- ListVideoClassifications ----------------------------------------------

export interface ListVideoClassificationsRequest {
  SpaceName?: string;
  ClassificationId?: number;
}
export interface VodVideoClassificationsData {
  ClassificationTrees?: VodClassification[];
}
export type ListVideoClassificationsResponse = VodResponse<VodVideoClassificationsData>;
