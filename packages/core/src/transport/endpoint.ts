import type { Configuration } from "./configuration.js";
import { DEFAULT_ENDPOINT_TABLE, type ServiceEndpointInfo } from "./endpoint-table.js";

export interface ResolvedEndpoint {
  host: string;
  /** scheme://host */
  prefix: string;
}

const ENDPOINT_SUFFIX = ".byteplusapi.com";
const DUALSTACK_ENDPOINT_SUFFIX = ".byteplus-api.com";
// cn-* regions that resolve to the international suffix (no .cn), per Python.
const CN_NON_MAINLAND_REGIONS = new Set(["cn-hongkong"]);

/** Parity with Python `ServiceEndpointInfoMissingError` / Go `ErrServiceEndpointInfoMissing`. */
export class ServiceEndpointInfoMissingError extends Error {
  constructor(public readonly service: string) {
    super(`byteplussdkcore: service endpoint info missing: service '${service}' not registered`);
    this.name = "ServiceEndpointInfoMissingError";
  }
}

function normalizeRegion(region: string | undefined): string {
  return region ? region.trim().toLowerCase() : "";
}

function isCnMainlandRegion(region: string): boolean {
  return region.startsWith("cn-") && !CN_NON_MAINLAND_REGIONS.has(region);
}

function standardizeServiceCode(service: string): string {
  return service.toLowerCase().replace(/_/g, "-");
}

/**
 * Build a host from a service entry (Python `ServiceEndpointInfo.get_endpoint_for`):
 * global services drop the region; a `regionEndpointMap` hit wins for regional
 * services; `.cn` is appended for cn-mainland regions when go-china is enabled.
 */
export function getEndpointFor(
  info: ServiceEndpointInfo,
  region: string | undefined,
  suffix: string,
): string {
  const normalizedRegion = normalizeRegion(region);
  const cnSuffix =
    info.goChinaEnabled && isCnMainlandRegion(normalizedRegion) ? ".cn" : "";
  const code = standardizeServiceCode(info.service);

  if (info.isGlobal) {
    return info.globalEndpoint || code + suffix + cnSuffix;
  }
  const mapped = info.regionEndpointMap?.[normalizedRegion];
  if (mapped !== undefined) return mapped;
  return `${code}.${normalizedRegion}${suffix}${cnSuffix}`;
}

/**
 * Resolve the endpoint. A host override is used verbatim (scheme stripped when it
 * carries one). Otherwise a config `customEndpoints` entry, else the per-service
 * default table, drives host selection — unknown services raise
 * {@link ServiceEndpointInfoMissingError}. Dualstack swaps the suffix to
 * `.byteplus-api.com`. Mirrors the Python DefaultEndpointProvider.
 */
export function resolveEndpoint(service: string, config: Configuration): ResolvedEndpoint {
  if (config.host) {
    if (config.host.startsWith("https://") || config.host.startsWith("http://")) {
      const prefix = config.host.replace(/\/+$/, "");
      const host = prefix.replace(/^https?:\/\//, "");
      return { host, prefix };
    }
    return { host: config.host, prefix: `${config.scheme}://${config.host}` };
  }

  const custom = config.customEndpoints?.[service];
  if (custom) {
    // Python resolves custom endpoints with the default suffix (no dualstack swap).
    const host = getEndpointFor(custom, config.region, ENDPOINT_SUFFIX);
    return { host, prefix: `${config.scheme}://${host}` };
  }

  const info = DEFAULT_ENDPOINT_TABLE[service];
  if (!info) throw new ServiceEndpointInfoMissingError(service);

  const dual =
    config.useDualStack ?? (process.env["BYTEPLUS_ENABLE_DUALSTACK"] === "true");
  const suffix = dual ? DUALSTACK_ENDPOINT_SUFFIX : ENDPOINT_SUFFIX;
  const host = getEndpointFor(info, config.region, suffix);
  return { host, prefix: `${config.scheme}://${host}` };
}
