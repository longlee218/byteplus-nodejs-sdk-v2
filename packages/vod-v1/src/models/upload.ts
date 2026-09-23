// Upload RPC request/response models (the OpenAPI ops; the direct-to-TOS
// transport is US-015). Ported field-for-field from the Python v1 proto.

import type { VodResponse } from "./common.js";
import type { VodSourceInfo } from "./business.js";

// ---- ApplyUploadInfo -------------------------------------------------------

export interface ApplyUploadInfoRequest {
  SpaceName?: string;
  SessionKey?: string;
  FileSize?: number;
  FileType?: string;
  FileName?: string;
  StorageClass?: number;
  FileExtension?: string;
  UploadHostPrefer?: string;
}

export interface VodStoreInfo {
  StoreUri?: string;
  Auth?: string;
}

export interface VodHeaderPair {
  Key?: string;
  Value?: string;
}

export interface VodUploadAddress {
  StoreInfos?: VodStoreInfo[];
  UploadHosts?: string[];
  UploadHeader?: VodHeaderPair[];
  SessionKey?: string;
}

export interface VodApplyUploadInfoData {
  UploadAddress?: VodUploadAddress;
}

export interface VodApplyUploadInfoResult {
  Data?: VodApplyUploadInfoData;
}

export type ApplyUploadInfoResponse = VodResponse<VodApplyUploadInfoResult>;

// ---- CommitUploadInfo ------------------------------------------------------

export interface CommitUploadInfoRequest {
  SpaceName?: string;
  SessionKey?: string;
  CallbackArgs?: string;
  Functions?: string;
  VodUploadSource?: string;
}

export interface VodCommitUploadInfoData {
  Vid?: string;
  PosterUri?: string;
  SourceInfo?: VodSourceInfo;
  Mid?: string;
}

export interface VodCommitUploadInfoResult {
  Data?: VodCommitUploadInfoData;
}

export type CommitUploadInfoResponse = VodResponse<VodCommitUploadInfoResult>;

// ---- QueryUploadTaskInfo ---------------------------------------------------

export interface QueryUploadTaskInfoRequest {
  JobIds?: string;
}

export interface VodURLSet {
  RequestId?: string;
  JobId?: string;
  SourceUrl?: string;
  State?: string;
  Vid?: string;
  SpaceName?: string;
  AccountId?: string;
  SourceInfo?: VodSourceInfo;
  CallbackArgs?: string;
}

export interface VodQueryUploadResult {
  MediaInfoList?: VodURLSet[];
  NotExistJobIds?: string[];
}

export interface VodQueryData {
  Data?: VodQueryUploadResult;
}

export type QueryUploadTaskInfoResponse = VodResponse<VodQueryData>;

// ---- UploadMediaByUrl (VodUrlUpload*) --------------------------------------

export interface VodUrlUploadURLSet {
  SourceUrl?: string;
  CallbackArgs?: string;
  Md5?: string;
  TemplateId?: string;
  Title?: string;
  Description?: string;
  Tags?: string;
  Category?: string;
  FileName?: string;
  ClassificationId?: number;
  StorageClass?: number;
  FileExtension?: string;
  UrlEncryptionAlgorithm?: string;
  EnableLowPriority?: boolean;
  FileType?: string;
  RecordType?: number;
}

export interface UploadMediaByUrlRequest {
  SpaceName?: string;
  URLSets?: VodUrlUploadURLSet[];
}

export interface ValuePair {
  JobId?: string;
  SourceUrl?: string;
}

export interface VodUrlResponseData {
  Data?: ValuePair[];
}

export type UploadMediaByUrlResponse = VodResponse<VodUrlResponseData>;

// ---- ParseUploadManifest ---------------------------------------------------

export interface ParseUploadManifestRequest {
  SpaceName?: string;
  ManifestType?: string;
  ManifestContent?: string;
}

export interface VodParseUploadManifestData {
  MediaSegments?: string[];
}

export interface VodParseUploadManifestResult {
  Data?: VodParseUploadManifestData;
}

export type ParseUploadManifestResponse = VodResponse<VodParseUploadManifestResult>;

// ---- UploadMedia (local file → TOS → commit; the transport is US-015) -------

export interface UploadMediaRequest {
  SpaceName?: string;
  FilePath?: string;
  CallbackArgs?: string;
  Functions?: string;
  FileName?: string;
  StorageClass?: number;
  FileExtension?: string;
  VodUploadSource?: string;
  UploadHostPrefer?: string;
  SupportParseManifest?: boolean;
}

/** Result of `uploadTob`: the object id + the session key to commit with. */
export interface UploadTobResult {
  oid: string;
  sessionKey: string;
}

/** Request for `uploadMaterial` (a raw material file → commit). */
export interface UploadMaterialRequest {
  SpaceName?: string;
  FilePath?: string;
  FileType?: string;
  FileName?: string;
  FileExtension?: string;
  UploadHostPrefer?: string;
  Functions?: string;
  CallbackArgs?: string;
}
