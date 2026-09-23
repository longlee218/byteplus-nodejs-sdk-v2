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
}
