// VodCdnV1 — domain / CDN ops. All GET RPC. US-020: domain + cdn tasks
// (US-021 extends this with the access/usage-data ops).

import type { VodV1Client } from "../client.js";
import { rpcGet } from "./rpc.js";
import type {
  CreateDomainRequest,
  CreateDomainResponse,
  ListDomainRequest,
  ListDomainResponse,
  CreateCdnRefreshTaskRequest,
  CreateCdnRefreshTaskResponse,
  CreateCdnPreloadTaskRequest,
  CreateCdnPreloadTaskResponse,
  ListCdnTasksRequest,
  ListCdnTasksResponse,
} from "../models/cdn.js";
import type {
  ListCdnAccessLogRequest,
  ListCdnAccessLogResponse,
  ListCdnTopAccessUrlRequest,
  ListCdnTopAccessUrlResponse,
  ListCdnTopAccessRequest,
  ListCdnTopAccessResponse,
  DescribeVodDomainBandwidthDataRequest,
  DescribeVodDomainBandwidthDataResponse,
  DescribeVodDomainTrafficDataRequest,
  DescribeVodDomainTrafficDataResponse,
  ListCdnUsageDataRequest,
  ListCdnStatusDataRequest,
  ListCdnPvDataRequest,
  CdnStatisticsCommonResponse,
  DescribeIpInfoRequest,
  DescribeIpInfoResponse,
} from "../models/cdn-data.js";

export class VodCdnV1 {
  constructor(protected readonly client: VodV1Client) {}

  createDomain(req: CreateDomainRequest): Promise<CreateDomainResponse> {
    return rpcGet(this.client, "CreateDomain", req);
  }
  listDomain(req: ListDomainRequest): Promise<ListDomainResponse> {
    return rpcGet(this.client, "ListDomain", req);
  }
  createCdnRefreshTask(req: CreateCdnRefreshTaskRequest): Promise<CreateCdnRefreshTaskResponse> {
    return rpcGet(this.client, "CreateCdnRefreshTask", req);
  }
  createCdnPreloadTask(req: CreateCdnPreloadTaskRequest): Promise<CreateCdnPreloadTaskResponse> {
    return rpcGet(this.client, "CreateCdnPreloadTask", req);
  }
  /** Wire Action is `ListCDNTasks` (encoded in api-info.ts). */
  listCdnTasks(req: ListCdnTasksRequest): Promise<ListCdnTasksResponse> {
    return rpcGet(this.client, "ListCdnTasks", req);
  }

  // ---- B: access + usage data ----------------------------------------------

  listCdnAccessLog(req: ListCdnAccessLogRequest): Promise<ListCdnAccessLogResponse> {
    return rpcGet(this.client, "ListCdnAccessLog", req);
  }
  listCdnTopAccessUrl(req: ListCdnTopAccessUrlRequest): Promise<ListCdnTopAccessUrlResponse> {
    return rpcGet(this.client, "ListCdnTopAccessUrl", req);
  }
  listCdnTopAccess(req: ListCdnTopAccessRequest): Promise<ListCdnTopAccessResponse> {
    return rpcGet(this.client, "ListCdnTopAccess", req);
  }
  describeVodDomainBandwidthData(req: DescribeVodDomainBandwidthDataRequest): Promise<DescribeVodDomainBandwidthDataResponse> {
    return rpcGet(this.client, "DescribeVodDomainBandwidthData", req);
  }
  describeVodDomainTrafficData(req: DescribeVodDomainTrafficDataRequest): Promise<DescribeVodDomainTrafficDataResponse> {
    return rpcGet(this.client, "DescribeVodDomainTrafficData", req);
  }
  listCdnUsageData(req: ListCdnUsageDataRequest): Promise<CdnStatisticsCommonResponse> {
    return rpcGet(this.client, "ListCdnUsageData", req);
  }
  listCdnStatusData(req: ListCdnStatusDataRequest): Promise<CdnStatisticsCommonResponse> {
    return rpcGet(this.client, "ListCdnStatusData", req);
  }
  listCdnPvData(req: ListCdnPvDataRequest): Promise<CdnStatisticsCommonResponse> {
    return rpcGet(this.client, "ListCdnPvData", req);
  }
  describeIpInfo(req: DescribeIpInfoRequest): Promise<DescribeIpInfoResponse> {
    return rpcGet(this.client, "DescribeIpInfo", req);
  }

  // ---- Tier-2 (faithful-broken) --------------------------------------------
  // Action not registered in api_info → throws "no such api", as in Python.

  startDomain(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "StartDomain", req);
  }
  stopDomain(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "StopDomain", req);
  }
  addDomainToScheduler(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "AddDomainToScheduler", req);
  }
  removeDomainFromScheduler(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "RemoveDomainFromScheduler", req);
  }
  updateDomainPlayRule(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "UpdateDomainPlayRule", req);
  }
  updateDomainExpire(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "UpdateDomainExpire", req);
  }
  addOrUpdateCertificate(req: Record<string, unknown> = {}): Promise<never> {
    return rpcGet(this.client, "AddOrUpdateCertificate", req);
  }
}
