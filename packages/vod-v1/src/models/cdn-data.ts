// Domain / CDN B models — access logs, top-access, bandwidth/traffic, usage,
// status, IP info, PV. Ported from the Python v1 proto.

import type { VodResponse } from "./common.js";

// ---- ListCdnAccessLog ------------------------------------------------------

export interface ListCdnAccessLogRequest {
  Domains?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  SpaceName?: string;
}
export interface VodCdnAccessLogElement {
  DownloadUrl?: string;
  FileSize?: number;
  FileName?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
}
export interface VodCdnAccessLogInfo {
  Domain?: string;
  LogList?: VodCdnAccessLogElement[];
}
export interface VodListCdnAccessLogResult {
  Logs?: VodCdnAccessLogInfo[];
}
export type ListCdnAccessLogResponse = VodResponse<VodListCdnAccessLogResult>;

// ---- ListCdnTopAccessUrl / ListCdnTopAccess --------------------------------

export interface ListCdnTopAccessUrlRequest {
  Domains?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  SortType?: string;
}
export interface VodCdnTopAccessUrlElement {
  Url?: string;
  Pv?: number;
  Flux?: number;
}
export interface VodListCdnTopAccessUrlResult {
  UrlInfos?: VodCdnTopAccessUrlElement[];
}
export type ListCdnTopAccessUrlResponse = VodResponse<VodListCdnTopAccessUrlResult>;

export interface ListCdnTopAccessRequest {
  Domains?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  SortType?: string;
  Item?: string;
}
export interface VodCdnTopAccessElement {
  ItemKey?: string;
  Value?: number;
}
export interface VodListCdnTopAccessResult {
  ItemInfos?: VodCdnTopAccessElement[];
}
export type ListCdnTopAccessResponse = VodResponse<VodListCdnTopAccessResult>;

// ---- DescribeVodDomainBandwidthData / TrafficData --------------------------

export interface DescribeVodDomainBandwidthDataRequest {
  DomainList?: string;
  StartTime?: string;
  EndTime?: string;
  Aggregation?: number;
  BandwidthType?: string;
  Area?: string;
}
export interface VodBandwidthData {
  Time?: string;
  Bandwidth?: number;
}
export interface VodDescribeVodDomainBandwidthDataResult {
  DomainList?: string[];
  StartTime?: string;
  EndTime?: string;
  Aggregation?: number;
  BandwidthType?: string;
  PeakBandwidth?: number;
  PeakBandwidthTime?: string;
  BandwidthDataList?: VodBandwidthData[];
}
export type DescribeVodDomainBandwidthDataResponse = VodResponse<VodDescribeVodDomainBandwidthDataResult>;

export interface DescribeVodDomainTrafficDataRequest {
  DomainList?: string;
  StartTime?: string;
  EndTime?: string;
  Aggregation?: number;
  TrafficType?: string;
}
export interface VodTrafficData {
  Time?: string;
  Traffic?: number;
}
export interface VodDescribeVodDomainTrafficDataResult {
  DomainList?: string[];
  StartTime?: string;
  EndTime?: string;
  Aggregation?: number;
  TrafficType?: string;
  TotalTraffic?: number;
  TrafficDataList?: VodTrafficData[];
}
export type DescribeVodDomainTrafficDataResponse = VodResponse<VodDescribeVodDomainTrafficDataResult>;

// ---- ListCdnUsageData / ListCdnStatusData / ListCdnPvData (shared result) --

export interface ListCdnUsageDataRequest {
  Domains?: string;
  Interval?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  DataType?: string;
  Metric?: string;
  NeedDetail?: boolean;
  Area?: string;
  Region?: string;
  Isp?: string;
  Protocol?: string;
  IpVersion?: string;
  BillingRegion?: string;
  TimeZone?: string;
}
export interface ListCdnStatusDataRequest {
  Domains?: string;
  Interval?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  DataType?: string;
  Metric?: string;
  NeedDetail?: boolean;
  TimeZone?: string;
}
export interface ListCdnPvDataRequest {
  Domains?: string;
  Interval?: string;
  StartTimestamp?: number;
  EndTimestamp?: number;
  DataType?: string;
  NeedDetail?: boolean;
  TimeZone?: string;
}
export interface VodPoint {
  Timestamp?: number;
  Value?: number;
}
export interface VodCdnStatisticsData {
  Name?: string;
  Metric?: string;
  DataType?: string;
  Points?: VodPoint[];
  Region?: string;
  Isp?: string;
  BillingRegion?: string;
}
export interface VodCdnStatisticsCommonResult {
  Datas?: VodCdnStatisticsData[];
  NoPermissionDomains?: string[];
}
export type CdnStatisticsCommonResponse = VodResponse<VodCdnStatisticsCommonResult>;

// ---- DescribeIpInfo --------------------------------------------------------

export interface DescribeIpInfoRequest {
  Ips?: string;
}
export interface VodCdnIpInfo {
  Ip?: string;
  CdnIp?: boolean;
  Location?: string;
  Isp?: string;
}
export type DescribeIpInfoResponse = VodResponse<VodCdnIpInfo[]>;
