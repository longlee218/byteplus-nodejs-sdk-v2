// Playback request/response models — ported field-for-field from the Python v1
// proto (byteplus_sdk/vod/models, introspected). PascalCase mirrors the wire.
// Optional everywhere: the wire omits defaults and callers set only what they need.

import type { VodResponse } from "./common.js";

// ---- GetPlayInfo -----------------------------------------------------------

export interface GetPlayInfoRequest {
  Vid?: string;
  Format?: string;
  Codec?: string;
  Definition?: string;
  FileType?: string;
  LogoType?: string;
  Base64?: string;
  Ssl?: string;
  NeedThumbs?: string;
  NeedBarrageMask?: string;
  CdnType?: string;
  UnionInfo?: string;
  HDRDefinition?: string;
  PlayScene?: string;
  DrmExpireTimestamp?: string;
  Quality?: string;
  PlayConfig?: string;
  ForceExpire?: string;
  DashMode?: string;
  DrmKEK?: string;
  JSPlayer?: string;
}

export interface VodVolumeInfo {
  Loudness?: number;
  Peak?: number;
}

export interface DrmPssh {
  WidevinePssh?: string;
  PlayReadyPssh?: string;
  FairPlayPssh?: string;
}

export interface VodPlayInfo {
  FileId?: string;
  Md5?: string;
  FileType?: string;
  Format?: string;
  Codec?: string;
  Definition?: string;
  MainPlayUrl?: string;
  BackupPlayUrl?: string;
  Bitrate?: number;
  Width?: number;
  Height?: number;
  Size?: number;
  CheckInfo?: string;
  IndexRange?: string;
  InitRange?: string;
  PlayAuth?: string;
  PlayAuthId?: string;
  LogoType?: string;
  Quality?: string;
  BarrageMaskOffset?: string;
  Duration?: number;
  KeyFrameAlignment?: string;
  Volume?: VodVolumeInfo;
  DrmType?: string;
  EncryptionPssh?: DrmPssh;
  MainUrlExpire?: string;
  BackupUrlExpire?: string;
  Channels?: number;
}

export interface VodAdaptiveInfo {
  MainPlayUrl?: string;
  BackupPlayUrl?: string;
  AdaptiveType?: string;
}

export interface VodThumbInfo {
  CaptureNum?: number;
  StoreUrls?: string[];
  CellWidth?: number;
  CellHeight?: number;
  ImgXLen?: number;
  ImgYLen?: number;
  Interval?: number;
  Format?: string;
}

export interface VodSubtitleInfo {
  Vid?: string;
  FileId?: string;
  Language?: string;
  LanguageId?: number;
  Format?: string;
  SubtitleId?: string;
  Title?: string;
  Tag?: string;
  Status?: string;
  Source?: string;
  StoreUri?: string;
  SubtitleUrl?: string;
  CreateTime?: string;
  Version?: string;
}

export interface BarrageMaskInfo {
  Version?: string;
  BarrageMaskUrl?: string;
  FileId?: string;
  FileSize?: number;
  FileHash?: string;
  UpdatedAt?: string;
  Bitrate?: number;
  HeadLen?: number;
}

export interface AdaptiveBitrateStreamingInfo {
  MainPlayUrl?: string;
  BackupPlayUrl?: string;
  AbrFormat?: string;
  PlayAuth?: string;
  PlayAuthId?: string;
}

export interface VodPlayInfoModel {
  Version?: string;
  Vid?: string;
  Status?: number;
  PosterUrl?: string;
  Duration?: number;
  FileType?: string;
  EnableAdaptive?: boolean;
  TotalCount?: number;
  AdaptiveInfo?: VodAdaptiveInfo;
  PlayInfoList?: VodPlayInfo[];
  ThumbInfoList?: VodThumbInfo[];
  BarrageMaskUrl?: string;
  SubtitleInfoList?: VodSubtitleInfo[];
  BarrageMaskInfo?: BarrageMaskInfo;
  AdaptiveBitrateStreamingInfo?: AdaptiveBitrateStreamingInfo;
}

export type GetPlayInfoResponse = VodResponse<VodPlayInfoModel>;

// ---- GetPrivateDrmPlayAuth -------------------------------------------------

export interface GetPrivateDrmPlayAuthRequest {
  DrmType?: string;
  Vid?: string;
  PlayAuthIds?: string;
  UnionInfo?: string;
}

export interface VodPrivateDrmPlayAuthInfo {
  PlayAuthId?: string;
  PlayAuthContent?: string;
}

export interface VodGetPrivateDrmPlayAuthResult {
  PlayAuthInfoList?: VodPrivateDrmPlayAuthInfo[];
}

export type GetPrivateDrmPlayAuthResponse = VodResponse<VodGetPrivateDrmPlayAuthResult>;

// ---- Create / Get HlsDecryptionKey ----------------------------------------

export interface CreateHlsDecryptionKeyRequest {
  SpaceName?: string;
}

export interface VodCreateHlsDecryptionKeyResult {
  SecretKey?: string;
  Ak?: string;
  IsBase64?: boolean;
  KeyFormat?: string;
}

export type CreateHlsDecryptionKeyResponse = VodResponse<VodCreateHlsDecryptionKeyResult>;

export interface GetHlsDecryptionKeyRequest {
  DrmAuthToken?: string;
  Ak?: string;
  Source?: string;
}

export interface VodGetHlsDecryptionKeyResult {
  SecretKey?: string;
}

export type GetHlsDecryptionKeyResponse = VodResponse<VodGetHlsDecryptionKeyResult>;
