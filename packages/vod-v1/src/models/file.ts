// File-management models (media B): GetFileInfos, DeleteMediaTosFile,
// ListFileMetaInfosByFileNames. Ported from the Python v1 proto.

import type { VodResponse } from "./common.js";

export interface GetFileInfosRequest {
  SpaceName?: string;
  EncodedFileNames?: string;
  BucketName?: string;
  NeedDownloadUrl?: boolean;
  DownloadUrlNetworkType?: string;
  DownloadUrlExpire?: number;
}
export interface VodFileInfo {
  FileName?: string;
  LastModifiedTime?: string;
  Size?: number;
  StorageClass?: string;
  HashCrc64?: string;
  EncodedFileName?: string;
  DownloadUrl?: string;
}
export interface VodGetFileInfosData {
  FileInfos?: VodFileInfo[];
  NotExistFileNames?: string[];
  NotExistEncodedFileNames?: string[];
}
export type GetFileInfosResponse = VodResponse<VodGetFileInfosData>;

export interface DeleteMediaTosFileRequest {
  FileNames?: string[];
  SpaceName?: string;
}
export interface VodDeleteMediaTosFileData {
  FailedFileNames?: string[];
}
export type DeleteMediaTosFileResponse = VodResponse<VodDeleteMediaTosFileData>;

export interface ListFileMetaInfosByFileNamesRequest {
  SpaceName?: string;
  FileNameEncodeds?: string;
  BucketName?: string;
}
export interface VodFileMetaInfo {
  Vid?: string;
  FileId?: string;
  MaterialId?: string;
  FileType?: string;
  FileName?: string;
  FileNameEncoded?: string;
}
export interface VodListFileMetaInfosByFileNamesResult {
  VodFileMetaInfos?: VodFileMetaInfo[];
}
export type ListFileMetaInfosByFileNamesResponse = VodResponse<VodListFileMetaInfosByFileNamesResult>;
