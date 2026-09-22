// Per-service endpoint metadata, ported verbatim from the Python
// `byteplussdkcore/endpoint/providers/default_provider.py` `default_endpoint`
// table. Decision 0100 — keep everything from the Python SDK.

export interface ServiceEndpointInfo {
  /** Raw service code; standardized to the host label as lower() + `_`→`-`. */
  readonly service: string;
  /** Global services drop the region segment from the host. */
  readonly isGlobal: boolean;
  /** Appends `.cn` for cn-mainland regions when true. */
  readonly goChinaEnabled: boolean;
  /** Fixed host for a global service (skips code-based host building). */
  readonly globalEndpoint?: string;
  /** region → host overrides (keys lowercased) for regional services. */
  readonly regionEndpointMap?: Readonly<Record<string, string>>;
}

// [isGlobal, goChinaEnabled] per service code. Adding a service is one line.
const TABLE_SPEC: Readonly<Record<string, readonly [boolean, boolean]>> = {
  vpc: [false, true],
  vke: [false, true],
  auto_scaling: [false, true],
  storage_ebs: [false, true],
  vedbm: [false, true],
  privatelink: [false, true],
  clb: [false, true],
  transitrouter: [false, true],
  directconnect: [false, true],
  vpn: [false, true],
  natgateway: [false, true],
  rds_mysql: [false, true],
  smc: [true, false],
  iam: [true, true],
  vepfs: [false, true],
  kms: [false, true],
  ecs: [false, true],
  mongodb: [false, true],
  private_zone: [true, true],
  rds_postgresql: [false, true],
  resource_share: [true, false],
  vmp: [false, true],
  tag: [true, false],
  cr: [false, true],
  alb: [false, true],
  sts: [false, true],
  hbase: [false, true],
  rds_mssql: [false, true],
  ml_platform: [false, false],
  apig: [false, false],
  ark: [false, false],
  waf: [true, false],
  quota: [true, false],
  dms: [false, true],
  vefaas: [false, false],
  cen: [true, false],
  cp: [false, false],
  cloudmonitor: [false, true],
  eco_partner: [true, false],
  milvus: [false, false],
  llmshield: [false, false],
  billing: [true, true],
  id: [false, false],
  clawsentry: [false, false],
  resourcecenter: [true, false],
  escloud: [false, false],
  cpaas: [true, false],
  filenas: [false, true],
  kafka: [false, true],
  kickart: [true, false],
  rabbitmq: [false, false],
  redis: [false, true],
  vod: [false, false],
  vs: [true, false],
  aidap: [false, false],
};

export const DEFAULT_ENDPOINT_TABLE: Readonly<Record<string, ServiceEndpointInfo>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(TABLE_SPEC).map(([service, [isGlobal, goChinaEnabled]]) => [
        service,
        Object.freeze({ service, isGlobal, goChinaEnabled }),
      ]),
    ),
  );
