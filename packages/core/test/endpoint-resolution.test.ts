import { describe, it, expect } from "vitest";
import {
  ApiClient,
  Configuration,
  ModelRegistry,
  resolveEndpoint,
  ServiceEndpointInfoMissingError,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type ServiceEndpointInfo,
} from "../src/index.js";

// (service, region, dualstack) -> host, values matched to the Python
// DefaultEndpointProvider (default_provider.py: get_endpoint_for + default_endpoint).
const CASES: ReadonlyArray<[string, string, boolean, string]> = [
  // regional service, default region
  ["vod", "ap-southeast-1", false, "vod.ap-southeast-1.byteplusapi.com"],
  // global services drop the region segment
  ["iam", "ap-southeast-1", false, "iam.byteplusapi.com"],
  ["billing", "ap-southeast-1", false, "billing.byteplusapi.com"],
  ["tag", "ap-southeast-1", false, "tag.byteplusapi.com"],
  // go-china: .cn suffix for cn-mainland regions when the service enables it
  ["ecs", "cn-beijing", false, "ecs.cn-beijing.byteplusapi.com.cn"],
  ["sts", "cn-shanghai", false, "sts.cn-shanghai.byteplusapi.com.cn"],
  // cn-hongkong is excluded from cn-mainland -> no .cn suffix
  ["ecs", "cn-hongkong", false, "ecs.cn-hongkong.byteplusapi.com"],
  // global + go-china -> .cn on the global host
  ["iam", "cn-beijing", false, "iam.byteplusapi.com.cn"],
  // vod does not enable go-china -> no .cn even in a cn region
  ["vod", "cn-beijing", false, "vod.cn-beijing.byteplusapi.com"],
  // service-code standardization: lowercase + _ -> -
  ["rds_mysql", "ap-southeast-1", false, "rds-mysql.ap-southeast-1.byteplusapi.com"],
  // dualstack suffix
  ["vod", "ap-southeast-1", true, "vod.ap-southeast-1.byteplus-api.com"],
  ["iam", "ap-southeast-1", true, "iam.byteplus-api.com"],
];

describe("resolveEndpoint — Python DefaultEndpointProvider parity", () => {
  it.each(CASES)("(%s, %s, dualstack=%s) -> %s", (service, region, useDualStack, host) => {
    const ep = resolveEndpoint(service, new Configuration({ region, useDualStack }));
    expect(ep.host).toBe(host);
    expect(ep.prefix).toBe(`https://${host}`);
  });

  it("raises a clear error for an unregistered service", () => {
    expect(() => resolveEndpoint("nosuch", new Configuration())).toThrow(
      ServiceEndpointInfoMissingError,
    );
    expect(() => resolveEndpoint("nosuch", new Configuration())).toThrow(/not registered/);
  });

  it("honors a host override verbatim (scheme kept, trailing slash stripped)", () => {
    expect(resolveEndpoint("vod", new Configuration({ host: "open.example.com" })).prefix).toBe(
      "https://open.example.com",
    );
    expect(resolveEndpoint("vod", new Configuration({ host: "http://h/" })).prefix).toBe("http://h");
  });

  it("uses a config custom endpoint over the default table", () => {
    const custom: Record<string, ServiceEndpointInfo> = {
      vod: { service: "vod", isGlobal: true, goChinaEnabled: false },
    };
    expect(resolveEndpoint("vod", new Configuration({ customEndpoints: custom })).host).toBe(
      "vod.byteplusapi.com",
    );
  });

  it("uses a custom regionEndpointMap override when the region matches", () => {
    const custom: Record<string, ServiceEndpointInfo> = {
      foo: {
        service: "foo",
        isGlobal: false,
        goChinaEnabled: false,
        regionEndpointMap: { "ap-southeast-1": "foo.pinned.example.com" },
      },
    };
    expect(
      resolveEndpoint("foo", new Configuration({ region: "ap-southeast-1", customEndpoints: custom }))
        .host,
    ).toBe("foo.pinned.example.com");
  });
});

// ---- Integration: a signed callApi hits the resolved host ----

function recorder(responses: HttpResponse[]) {
  const requests: HttpRequest[] = [];
  let i = 0;
  const client: HttpClient = async (req) => {
    requests.push(req);
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r as HttpResponse;
  };
  return { client, requests };
}

const ok = (): HttpResponse => ({
  status: 200,
  headers: {},
  body: JSON.stringify({ ResponseMetadata: { RequestId: "x" }, Result: {} }),
});

const signedCfg = (rec: ReturnType<typeof recorder>, extra = {}) =>
  new Configuration({
    ak: "AKdummy",
    sk: "SKdummy",
    httpClient: rec.client,
    registry: new ModelRegistry(),
    clock: () => new Date(Date.UTC(2025, 6, 1, 12, 34, 56)),
    sleep: async () => {},
    ...extra,
  });

describe("callApi uses the resolved host", () => {
  it("routes a global service without the region segment", async () => {
    const rec = recorder([ok()]);
    await new ApiClient(signedCfg(rec, { region: "ap-southeast-1" })).callApi({
      resourcePath: "/GetUser/2018-01-01/iam/get/text_plain/",
      method: "GET",
      headerParams: { "Content-Type": "text/plain" },
    });
    const req = rec.requests[0] as HttpRequest;
    expect(req.headers["Host"]).toBe("iam.byteplusapi.com");
    expect(req.url).toBe("https://iam.byteplusapi.com/?Action=GetUser&Version=2018-01-01");
    expect(req.headers["Authorization"]).toMatch(/^HMAC-SHA256 Credential=AKdummy\//);
  });

  it("routes a cn-mainland go-china service with the .cn suffix", async () => {
    const rec = recorder([ok()]);
    await new ApiClient(signedCfg(rec, { region: "cn-beijing" })).callApi({
      resourcePath: "/RunInstances/2020-04-01/ecs/get/text_plain/",
      method: "GET",
      headerParams: { "Content-Type": "text/plain" },
    });
    const req = rec.requests[0] as HttpRequest;
    expect(req.headers["Host"]).toBe("ecs.cn-beijing.byteplusapi.com.cn");
    expect(req.url).toContain("https://ecs.cn-beijing.byteplusapi.com.cn/");
  });
});
