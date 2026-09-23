// VodV1Client — the v1 VOD dispatch core. Ports byteplus_sdk/base/Service's
// get / post / json / get_sign_url over @byteplus-sdk/core's SignerV4, using the
// fixed region→host map and the Action+Version query convention. It ships no VOD
// operations; the operation slices (US-012+) call these primitives.

import {
  signV4,
  signUrl,
  urlencode,
  fetchHttpClient,
  pyJsonStringify,
  ApiException,
  type HttpClient,
  type HttpRequest,
  type SignCredentials,
  type SignContext,
  type CredentialProvider,
} from "@byteplus-sdk/core";
import { VOD_V1_API_INFO, type V1ApiEntry } from "./api-info.js";
import { serializeParams } from "./params.js";
import { VOD_V1_DEFAULT_REGION, VOD_V1_SERVICE, resolveV1Host } from "./service-config.js";

export interface VodV1Options {
  ak?: string;
  sk?: string;
  sessionToken?: string;
  /** Region — selects the API host. Default `ap-singapore-1`. */
  region?: string;
  /** Full host override; when set, `region` still drives signing but not the host. */
  host?: string;
  /** URL scheme, default `https`. */
  scheme?: string;
  /** Async credential source (takes precedence over literal ak/sk for RPC calls). */
  credentialProvider?: CredentialProvider;
  /** Injectable HTTP client (default global fetch); tests pass a recorder. */
  httpClient?: HttpClient;
  /** Injectable clock for deterministic signing in tests. */
  clock?: () => Date;
  /** User-Agent header value. */
  userAgent?: string;
}

const DEFAULT_USER_AGENT = "byteplus-sdk-nodejs-vod-v1/0.1.0";

export class VodV1Client {
  readonly region: string;
  readonly host: string;
  readonly scheme: string;
  private readonly ak?: string;
  private readonly sk?: string;
  private readonly sessionToken?: string;
  private readonly credentialProvider?: CredentialProvider;
  private readonly httpClient: HttpClient;
  private readonly clock?: () => Date;
  private readonly userAgent: string;

  constructor(opts: VodV1Options = {}) {
    this.region = opts.region ?? VOD_V1_DEFAULT_REGION;
    this.host = opts.host ?? resolveV1Host(this.region);
    this.scheme = opts.scheme ?? "https";
    this.ak = opts.ak;
    this.sk = opts.sk;
    this.sessionToken = opts.sessionToken;
    this.credentialProvider = opts.credentialProvider;
    this.httpClient = opts.httpClient ?? fetchHttpClient;
    this.clock = opts.clock;
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
  }

  /** Look up an operation, or throw the Python "no such api" error. */
  private entry(name: string): V1ApiEntry {
    const e = VOD_V1_API_INFO[name];
    if (e === undefined) throw new Error("no such api");
    return e;
  }

  private signContext(): SignContext {
    return { region: this.region, service: VOD_V1_SERVICE, clock: this.clock };
  }

  private literalCredentials(): SignCredentials {
    if (this.ak === undefined || this.sk === undefined) {
      throw new Error("getSignUrl requires literal ak/sk on the client");
    }
    return { ak: this.ak, sk: this.sk, sessionToken: this.sessionToken };
  }

  private async resolveCredentials(): Promise<SignCredentials> {
    if (this.credentialProvider) {
      const c = await this.credentialProvider.getCredentials();
      return { ak: c.ak, sk: c.sk, sessionToken: c.sessionToken };
    }
    return this.literalCredentials();
  }

  private queryString(query: Record<string, string>): string {
    const pairs = Object.entries(query);
    return pairs.length === 0 ? "" : "?" + urlencode(pairs);
  }

  /**
   * Build and sign the outbound request for an operation. Returns the exact
   * `HttpRequest` (url, headers, body) that would be sent — the pure, offline
   * seam the tests assert against.
   */
  buildRequest(name: string, creds: SignCredentials, params?: Record<string, unknown>, form?: Record<string, unknown>, jsonBody?: unknown): HttpRequest {
    const e = this.entry(name);
    const query: Record<string, string> = { Action: e.action, Version: e.version, ...serializeParams(params) };
    const headers: Record<string, string> = {
      Host: this.host,
      "User-Agent": this.userAgent,
      Accept: "application/json",
    };

    let body = "";
    let postParams: Array<[string, string]> | undefined;
    if (e.dispatch === "postForm") {
      postParams = Object.entries(serializeParams(form));
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = urlencode(postParams);
    } else if (e.dispatch === "postJson") {
      // The JSON body is SIGNED: Python `hashed_canonical_request_v4` hashes
      // `json.dumps(request.body)` (default spaced separators), and requests
      // sends the same. Use pyJsonStringify so the signed+sent bytes match.
      body = jsonBody === undefined ? "" : pyJsonStringify(jsonBody);
      headers["Content-Type"] = "application/json";
    }

    signV4({ path: "/", method: e.method, headers, body, query, postParams }, creds, this.signContext());
    const url = `${this.scheme}://${this.host}/` + this.queryString(query);
    return { method: e.method, url, headers, body };
  }

  private async send(req: HttpRequest): Promise<string> {
    const res = await this.httpClient(req);
    if (res.status < 200 || res.status > 299) {
      throw new ApiException(res.status, `HTTP ${res.status}`, res.body, res.headers);
    }
    return res.body;
  }

  /** GET dispatch (Action+Version+params in query). Returns the raw response body. */
  async get(name: string, params?: Record<string, unknown>): Promise<string> {
    const creds = await this.resolveCredentials();
    return this.send(this.buildRequest(name, creds, params));
  }

  /** POST x-www-form-urlencoded dispatch (params in query, form in body). */
  async post(name: string, params: Record<string, unknown> | undefined, form: Record<string, unknown>): Promise<string> {
    const creds = await this.resolveCredentials();
    return this.send(this.buildRequest(name, creds, params, form));
  }

  /** POST JSON dispatch (params in query, JSON body). */
  async json(name: string, params: Record<string, unknown> | undefined, body: unknown): Promise<string> {
    const creds = await this.resolveCredentials();
    return this.send(this.buildRequest(name, creds, params, undefined, body));
  }

  /**
   * Build a presigned request URL (no network), porting `get_sign_url`. Requires
   * literal ak/sk on the client (Python signs URLs from the service's static
   * credentials). Basis for the play-auth / DRM token builders (US-012/013).
   */
  getSignUrl(name: string, params?: Record<string, unknown>): string {
    const e = this.entry(name);
    const query: Record<string, string> = { Action: e.action, Version: e.version, ...serializeParams(params) };
    // Python `SignerV4.sign_url` always signs with empty SignedHeaders (host is
    // NOT signed) — so we omit `host` here; passing it would sign the host and
    // diverge from the Python fixture.
    return signUrl({ path: "/", method: e.method, query }, this.literalCredentials(), this.signContext());
  }
}
