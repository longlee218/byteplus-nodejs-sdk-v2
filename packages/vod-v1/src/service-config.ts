// v1 VOD service configuration — region→host map and defaults.
// Port of byteplus_sdk/vod/VodServiceConfig.get_service_info: only two regions
// are recognized; an unknown region throws (Python raises "Cant find the
// region"). Service code is fixed "vod"; scheme https.

/** The service code used for SignatureV4 (Python Credentials(..., 'vod', ...)). */
export const VOD_V1_SERVICE = "vod";

/** Default region, matching Python `VodServiceConfig(region='ap-singapore-1')`. */
export const VOD_V1_DEFAULT_REGION = "ap-singapore-1";

/** Region → API host. The only two hosts the Python v1 SDK ships. */
export const V1_HOSTS: Record<string, string> = {
  "ap-singapore-1": "vod.byteplusapi.com",
  "ap-southeast-1": "vod.ap-southeast-1.byteplusapi.com",
};

/**
 * Resolve the VOD v1 API host for a region. Throws on an unrecognized region,
 * mirroring the Python SDK (which cannot sign against an unknown host).
 */
export function resolveV1Host(region: string): string {
  const host = V1_HOSTS[region];
  if (host === undefined) {
    throw new Error(`unknown region '${region}': expected one of ${Object.keys(V1_HOSTS).join(", ")}`);
  }
  return host;
}
