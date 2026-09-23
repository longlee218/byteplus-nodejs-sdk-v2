import { describe, it, expect } from "vitest";
import { VodV1, VodV1Client, VodDrmV1 } from "../src/index.js";

const AK = "AKTESTFIXTURE";
const SK = "SKTESTFIXTURE";
const CLOCK = () => new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
const drm = () => new VodDrmV1(new VodV1Client({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK }));
const q = (s: string) => Object.fromEntries(new URLSearchParams(s));

describe("VodDrmV1 builders (Python differential)", () => {
  it("getThirdPartyDrmAuthToken matches Python get_third_party_drm_auth_token", () => {
    const pyToken =
      "Action=GetDrmLicense&Version=2023-01-01&Vid=v-1&Kid=kid-1&ThirdPartyDrmType=widevine&X-Expires=600&X-Date=20230101T000000Z&X-NotSignBody=&X-Credential=AKTESTFIXTURE%2F20230101%2Fap-singapore-1%2Fvod%2Frequest&X-Algorithm=HMAC-SHA256&X-SignedHeaders=&X-SignedQueries=Action%3BKid%3BThirdPartyDrmType%3BVersion%3BVid%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-Expires%3BX-NotSignBody%3BX-SignedHeaders%3BX-SignedQueries&X-Signature=0232bcf9100f366c63ab7177aa9294bf487e359deca8945c62e817934455b4c3";
    const out = drm().getThirdPartyDrmAuthToken({ Vid: "v-1", Kid: "kid-1", ThirdPartyDrmType: "widevine" }, 600);
    const decoded = JSON.parse(Buffer.from(out, "base64").toString("utf-8"));
    expect(decoded.TokenVersion).toBe("V2");
    expect(q(decoded.GetThirdPartyDrmAuthToken)).toEqual(q(pyToken));
    expect(q(decoded.GetThirdPartyDrmAuthToken)["X-Signature"]).toBe(
      "0232bcf9100f366c63ab7177aa9294bf487e359deca8945c62e817934455b4c3",
    );
  });

  it("getFairPlayCertUrl matches Python get_fairplay_cert_url", () => {
    const pyQuery =
      "Action=GetFairPlayCert&Version=2023-01-01&CertId=cert-123&X-Expires=600&X-Date=20230101T000000Z&X-NotSignBody=&X-Credential=AKTESTFIXTURE%2F20230101%2Fap-singapore-1%2Fvod%2Frequest&X-Algorithm=HMAC-SHA256&X-SignedHeaders=&X-SignedQueries=Action%3BCertId%3BVersion%3BX-Algorithm%3BX-Credential%3BX-Date%3BX-Expires%3BX-NotSignBody%3BX-SignedHeaders%3BX-SignedQueries&X-Signature=43b1022c3002d3e376ebf429449285656c36b82ab8ad2630a7d13e38232f6e5b";
    const out = drm().getFairPlayCertUrl("cert-123", 600);
    expect(out.startsWith("https://vod.byteplusapi.com/?")).toBe(true);
    expect(q(out.split("?")[1]!)).toEqual(q(pyQuery));
    expect(q(out.split("?")[1]!)["X-Signature"]).toBe(
      "43b1022c3002d3e376ebf429449285656c36b82ab8ad2630a7d13e38232f6e5b",
    );
  });

  it("omits X-Expires when expire is 0", () => {
    const out = drm().getFairPlayCertUrl("cert-123", 0);
    expect(q(out.split("?")[1]!)["X-Expires"]).toBeUndefined();
  });

  it("VodV1 facade exposes drm", () => {
    const sdk = new VodV1({ ak: AK, sk: SK, region: "ap-singapore-1", clock: CLOCK });
    expect(sdk.drm).toBeInstanceOf(VodDrmV1);
  });
});
