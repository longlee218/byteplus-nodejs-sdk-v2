// The v1 VOD action table — a faithful port of the `api_info` map in
// byteplus_sdk/vod/VodServiceConfig.get_api_info(). Lookup key = the name a
// caller passes to the dispatch primitives (identical to the Python api_info
// key); `action` = the wire `Action` query value (usually identical, except
// `ListCdnTasks` whose wire Action is `ListCDNTasks`); `version` = the wire
// `Version`; `dispatch` = how the request body is encoded, matching which base
// method the Python wrapper calls (get / post-form / json).
//
// Path is always "/". Source of truth:
// docs/product/reference-byteplus-python-sdk-v1/operations-catalog.md

export type V1Dispatch = "get" | "postForm" | "postJson";

export interface V1ApiEntry {
  /** Wire Action query value. */
  action: string;
  /** Wire Version query value (per-operation). */
  version: string;
  /** HTTP method. */
  method: "GET" | "POST";
  /** Body encoding, matching the Python base dispatch used by the wrapper. */
  dispatch: V1Dispatch;
}

const GET = (action: string, version: string): V1ApiEntry => ({ action, version, method: "GET", dispatch: "get" });
const POST_FORM = (action: string, version: string): V1ApiEntry => ({ action, version, method: "POST", dispatch: "postForm" });
const POST_JSON = (action: string, version: string): V1ApiEntry => ({ action, version, method: "POST", dispatch: "postJson" });

const V1 = "2023-01-01";
const V7 = "2023-07-01";

/** All 60 wired v1 VOD operations. */
export const VOD_V1_API_INFO: Record<string, V1ApiEntry> = {
  // Playback
  GetPlayInfo: GET("GetPlayInfo", V1),
  GetPrivateDrmPlayAuth: GET("GetPrivateDrmPlayAuth", V1),
  CreateHlsDecryptionKey: GET("CreateHlsDecryptionKey", V7),
  GetHlsDecryptionKey: GET("GetHlsDecryptionKey", V1),

  // Upload (OpenAPI ops; the TOS transport is separate — see US-015)
  UploadMediaByUrl: POST_FORM("UploadMediaByUrl", V1),
  QueryUploadTaskInfo: GET("QueryUploadTaskInfo", V1),
  ApplyUploadInfo: GET("ApplyUploadInfo", V1),
  CommitUploadInfo: GET("CommitUploadInfo", V1),
  ParseUploadManifest: POST_FORM("ParseUploadManifest", V1),

  // Media management
  UpdateMediaInfo: GET("UpdateMediaInfo", V1),
  UpdateMediaPublishStatus: GET("UpdateMediaPublishStatus", V1),
  GetMediaInfos: GET("GetMediaInfos", V1),
  DeleteMedia: GET("DeleteMedia", V1),
  DeleteTranscodes: GET("DeleteTranscodes", V1),
  GetMediaList: GET("GetMediaList", V1),
  GetSubtitleInfoList: GET("GetSubtitleInfoList", V1),
  UpdateSubtitleStatus: GET("UpdateSubtitleStatus", V1),
  UpdateSubtitleInfo: GET("UpdateSubtitleInfo", V1),
  ListVideoClassifications: GET("ListVideoClassifications", V1),
  CreatePlaylist: GET("CreatePlaylist", V1),
  GetPlaylists: GET("GetPlaylists", V1),
  UpdatePlaylist: GET("UpdatePlaylist", V1),
  DeletePlaylist: GET("DeletePlaylist", V1),
  GetFileInfos: GET("GetFileInfos", V7),
  DeleteMediaTosFile: POST_FORM("DeleteMediaTosFile", V7),
  ListFileMetaInfosByFileNames: POST_FORM("ListFileMetaInfosByFileNames", V7),

  // Transcode / workflow
  StartWorkflow: GET("StartWorkflow", V1),
  RetrieveTranscodeResult: GET("RetrieveTranscodeResult", V1),
  GetWorkflowExecution: GET("GetWorkflowExecution", V1),

  // Space
  CreateSpace: GET("CreateSpace", V1),
  ListSpace: GET("ListSpace", V7),
  GetSpaceDetail: GET("GetSpaceDetail", V7),
  UpdateSpaceUploadConfig: GET("UpdateSpaceUploadConfig", V1),
  DescribeVodSpaceStorageData: GET("DescribeVodSpaceStorageData", V1),

  // Domain / CDN — note the key→Action casing rename on ListCdnTasks
  CreateDomain: GET("CreateDomain", V1),
  ListDomain: GET("ListDomain", V1),
  CreateCdnRefreshTask: GET("CreateCdnRefreshTask", V1),
  CreateCdnPreloadTask: GET("CreateCdnPreloadTask", V1),
  ListCdnTasks: GET("ListCDNTasks", V1),
  ListCdnAccessLog: GET("ListCdnAccessLog", V1),
  ListCdnTopAccessUrl: GET("ListCdnTopAccessUrl", V1),
  ListCdnTopAccess: GET("ListCdnTopAccess", V7),
  DescribeVodDomainBandwidthData: GET("DescribeVodDomainBandwidthData", V1),
  DescribeVodDomainTrafficData: GET("DescribeVodDomainTrafficData", V1),
  ListCdnUsageData: GET("ListCdnUsageData", V1),
  ListCdnStatusData: GET("ListCdnStatusData", V1),
  DescribeIpInfo: GET("DescribeIpInfo", V1),
  ListCdnPvData: GET("ListCdnPvData", V1),

  // Callback
  AddCallbackSubscription: GET("AddCallbackSubscription", V1),
  SetCallbackEvent: GET("SetCallbackEvent", V1),

  // Measure / billing
  DescribeVodSpaceTranscodeData: GET("DescribeVodSpaceTranscodeData", V1),
  DescribeVodSnapshotData: GET("DescribeVodSnapshotData", V1),
  DescribeVodEnhanceImageData: GET("DescribeVodEnhanceImageData", V1),
  DescribeVodSpaceSubtitleStatisData: GET("DescribeVodSpaceSubtitleStatisData", V1),
  DescribeVodPlayedStatisData: GET("DescribeVodPlayedStatisData", V1),
  DescribeVodMostPlayedStatisData: GET("DescribeVodMostPlayedStatisData", V1),
  DescribeVodRealtimeMediaData: GET("DescribeVodRealtimeMediaData", V1),

  // DRM
  GetDrmLicense: POST_JSON("GetDrmLicense", V1),
  GetFairPlayCert: GET("GetFairPlayCert", V1),

  // Quality platform
  GetVodMediaPlayData: POST_JSON("GetVodMediaPlayData", "2025-04-01"),
};

/** Number of wired operations — asserted by tests to catch accidental drops. */
export const VOD_V1_OP_COUNT = Object.keys(VOD_V1_API_INFO).length;
