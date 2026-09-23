// VodDrmV1 — commercial-DRM helpers. Ports get_third_party_drm_auth_token and
// get_fairplay_cert_url. Neither GetDrmLicense nor GetFairPlayCert has a direct
// RPC method in the Python SDK; both are reached only through these builders.

import { pyJsonStringify } from "@byteplus-sdk/core";
import type { VodV1Client } from "../client.js";
import { base64, withExpires } from "./token-util.js";
import type { GetDrmLicenseRequest } from "../models/drm.js";

export class VodDrmV1 {
  constructor(private readonly client: VodV1Client) {}

  /** base64({"TokenVersion":"V2","GetThirdPartyDrmAuthToken":<signed GetDrmLicense URL>}). */
  getThirdPartyDrmAuthToken(req: GetDrmLicenseRequest, expire: number): string {
    const token = this.client.getSignUrl("GetDrmLicense", withExpires(req, expire));
    return base64(pyJsonStringify({ TokenVersion: "V2", GetThirdPartyDrmAuthToken: token }));
  }

  /** "{scheme}://{host}/?{signed GetFairPlayCert query}" — Python get_fairplay_cert_url. */
  getFairPlayCertUrl(certId: string, expire: number): string {
    const params: Record<string, unknown> = { CertId: certId };
    if (expire > 0) params["X-Expires"] = String(expire);
    const raw = this.client.getSignUrl("GetFairPlayCert", params);
    return `${this.client.scheme}://${this.client.host}/?${raw}`;
  }
}
