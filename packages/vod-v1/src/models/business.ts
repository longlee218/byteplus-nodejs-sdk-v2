// Shared business types reused across slices (upload, media, …). Ported from the
// Python v1 proto business modules. PascalCase mirrors the wire.

export interface SubStreamInfo {
  FileType?: string;
  Channels?: number;
}

export interface VodVideoStreamMeta {
  Codec?: string;
  Height?: number;
  Width?: number;
  Duration?: number;
  Definition?: string;
  Bitrate?: number;
  Fps?: number;
  SubStreamInfo?: SubStreamInfo[];
}

export interface VodAudioStreamMeta {
  Codec?: string;
  Duration?: number;
  SampleRate?: number;
  Bitrate?: number;
  Quality?: string;
  Channels?: number;
  SubStreamInfo?: SubStreamInfo[];
}

export interface VodSourceInfo {
  FileId?: string;
  Md5?: string;
  FileType?: string;
  Codec?: string;
  Height?: number;
  Width?: number;
  Format?: string;
  Duration?: number;
  Size?: number;
  StoreUri?: string;
  Definition?: string;
  Bitrate?: number;
  Fps?: number;
  CreateTime?: string;
  Quality?: string;
  DynamicRange?: string;
  VideoStreamMeta?: VodVideoStreamMeta;
  AudioStreamMeta?: VodAudioStreamMeta;
  TosStorageClass?: string;
  FileName?: string;
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

/** Upload storage class (`vod_upload_pb2.StorageClassType`). */
export enum StorageClassType {
  Default = 0,
  Standard = 1,
  Archive = 2,
}
