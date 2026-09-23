// DRM request models — ported from the Python v1 proto. GetFairPlayCert takes
// only a certId string (no request interface), matching the Python builder.

export interface GetDrmLicenseRequest {
  Vid?: string;
  Kid?: string;
  ThirdPartyDrmType?: string;
}
