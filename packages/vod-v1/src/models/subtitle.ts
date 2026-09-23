// Subtitle models (media B). Ported from the Python v1 proto. `VodSubtitleInfo`
// is shared (see business.ts).

import type { VodResponse, VodMetadataResponse } from "./common.js";
import type { VodSubtitleInfo } from "./business.js";

export interface GetSubtitleInfoListRequest {
  Vid?: string;
  FileIds?: string;
  Languages?: string;
  Formats?: string;
  LanguageIds?: string;
  SubtitleIds?: string;
  Status?: string;
  Title?: string;
  Tag?: string;
  Offset?: string;
  PageSize?: string;
  Ssl?: string;
}

export interface VodFileSubtitleInfo {
  FileId?: string;
  SubtitleInfoList?: VodSubtitleInfo[];
}

export interface VodGetSubtitleInfoListData {
  Vid?: string;
  FileSubtitleInfoList?: VodFileSubtitleInfo[];
  NotExistFileIds?: string[];
  TotalCount?: number;
  Offset?: number;
  PageSize?: number;
}
export type GetSubtitleInfoListResponse = VodResponse<VodGetSubtitleInfoListData>;

export interface UpdateSubtitleStatusRequest {
  Vid?: string;
  FileIds?: string;
  Languages?: string;
  Formats?: string;
  Status?: string;
}
export interface VodUpdateSubtitleStatusData {
  NotExistFileIds?: string[];
}
export type UpdateSubtitleStatusResponse = VodResponse<VodUpdateSubtitleStatusData>;

export interface UpdateSubtitleInfoRequest {
  Vid?: string;
  FileId?: string;
  Language?: string;
  Format?: string;
  Title?: string;
  Tag?: string;
}
export type UpdateSubtitleInfoResponse = VodMetadataResponse;
