import type { Configuration } from "./configuration.js";

export interface ResolvedEndpoint {
  host: string;
  /** scheme://host */
  prefix: string;
}

/**
 * Resolve the endpoint. A host override is used verbatim (scheme stripped when
 * it carries one); otherwise `${service}.${region}${suffix}`. Dualstack suffix
 * `.byteplus-api.com`, else `.byteplusapi.com` (Python DefaultEndpointProvider).
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
  const dual =
    config.useDualStack ?? (process.env["BYTEPLUS_ENABLE_DUALSTACK"] === "true");
  const suffix = dual ? ".byteplus-api.com" : ".byteplusapi.com";
  const host = `${service}.${config.region}${suffix}`;
  return { host, prefix: `${config.scheme}://${host}` };
}
