// Domain / CDN A models (domain + cdn tasks). Ported from the Python v1 proto.
// CreateDomain uses the V2 request/response shape (Action stays "CreateDomain").

import type { VodResponse, VodMetadataResponse } from "./common.js";

// ---- CreateDomain (V2 shape) ----------------------------------------------

export interface OriginLine {
  Address?: string;
  InstanceType?: string;
  OriginHost?: string;
}
export interface OriginAction {
  OriginLines?: OriginLine[];
}
export interface CdnOriginRule {
  OriginAction?: OriginAction;
}
export interface CreateDomainRequest {
  SpaceName?: string;
  DomainType?: string;
  Domain?: string;
  SourceStationType?: number;
  SourceStationAddressType?: number;
  Area?: string;
  BucketName?: string;
  Origin?: CdnOriginRule[];
  Host?: string;
}
export type CreateDomainResponse = VodMetadataResponse;

// ---- ListDomain ------------------------------------------------------------

export interface ListDomainRequest {
  SpaceName?: string;
  DomainType?: string;
  SourceStationType?: number;
  Offset?: number;
  Limit?: number;
}
export interface VodDomainCertificateInfo {
  CertificateId?: string;
  CertificateName?: string;
  CertificatePub?: string;
  CertificatePri?: string;
  HttpsStatus?: string;
  ExpiredAt?: string;
  CertificateCenterCertificateId?: string;
}
export interface VodDomainOriginBucketInfo {
  BucketName?: string;
  BucketSourceType?: string;
  BucketRegion?: string;
}
export interface VodDomainSourceInfo {
  SourceStationType?: number;
  SourceStationAddressType?: number;
  Origin?: string;
  Bucket?: VodDomainOriginBucketInfo;
}
export interface VodDomainoInfo {
  Domain?: string;
  Cname?: string;
  ConfigStatus?: string;
  CnameStatus?: string;
  Status?: string;
  Certificate?: VodDomainCertificateInfo;
  CreateTime?: string;
  UpdateTime?: string;
  Region?: string;
  Sources?: VodDomainSourceInfo[];
  LockStatus?: string;
  CdnStatus?: string;
}
export interface VodDomainInstanceInfo {
  InstanceId?: string;
  Domains?: VodDomainoInfo[];
  CanSelfEditing?: boolean;
  ConfigStatus?: string;
}
export interface VodDomainInstanceInfos {
  ByteInstances?: VodDomainInstanceInfo[];
  OtherInstances?: VodDomainInstanceInfo[];
}
export interface VodDomainConfigInfo {
  SpaceName?: string;
  PlayInstanceInfo?: VodDomainInstanceInfos;
  ImageInstanceInfo?: VodDomainInstanceInfos;
  DefaultPlayDomain?: string;
  Total?: number;
  Offset?: number;
}
export type ListDomainResponse = VodResponse<VodDomainConfigInfo>;

// ---- CDN refresh / preload tasks ------------------------------------------

export interface CreateCdnRefreshTaskRequest {
  SpaceName?: string;
  Urls?: string;
  Type?: string;
}
export interface VodCreateCdnTaskResult {
  TaskId?: string;
}
export type CreateCdnRefreshTaskResponse = VodResponse<VodCreateCdnTaskResult>;

export interface CreateCdnPreloadTaskRequest {
  SpaceName?: string;
  Urls?: string;
}
export type CreateCdnPreloadTaskResponse = VodResponse<VodCreateCdnTaskResult>;

// ---- ListCdnTasks (wire Action ListCDNTasks) ------------------------------

export interface ListCdnTasksRequest {
  SpaceName?: string;
  TaskId?: string;
  DomainName?: string;
  TaskType?: string;
  Status?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  PageNum?: number;
  PageSize?: number;
}
export interface VodContentInfo {
  ItemId?: string;
  Url?: string;
  Status?: string;
  TaskType?: string;
  CreateTimestamp?: number;
  TaskId?: string;
}
export interface VodCdnTaskResult {
  TotalCount?: number;
  PageNum?: number;
  PageSize?: number;
  ContentInfos?: VodContentInfo[];
}
export type ListCdnTasksResponse = VodResponse<VodCdnTaskResult>;
