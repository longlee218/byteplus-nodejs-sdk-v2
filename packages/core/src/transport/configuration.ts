import type { CredentialProvider } from "../auth/types.js";
import type { HttpClient } from "./http.js";
import { fetchHttpClient } from "./http.js";
import type { ModelRegistry } from "./registry.js";
import { defaultRegistry } from "./registry.js";
import { realSleep } from "./retry.js";
import { randomUUID } from "node:crypto";

export interface ConfigurationOptions {
  ak?: string;
  sk?: string;
  sessionToken?: string;
  region?: string;
  /** Full host override, e.g. "open.byteplusapi.com" or "https://host". */
  host?: string;
  scheme?: string;
  useDualStack?: boolean;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
  maxRetries?: number;
  credentialProvider?: CredentialProvider;
  httpClient?: HttpClient;
  registry?: ModelRegistry;
  /** Injectable clock for deterministic signing in tests. */
  clock?: () => Date;
  /** Injectable sleep for retry backoff (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable per-call invocation id (X-Sdk-Invocation-Id); default random uuid. */
  invocationId?: () => string;
  /** User-Agent header value. */
  userAgent?: string;
}

/** Client configuration with BytePlus defaults. */
export class Configuration {
  ak?: string;
  sk?: string;
  sessionToken?: string;
  region: string;
  host?: string;
  scheme: string;
  useDualStack?: boolean;
  connectTimeoutMs: number;
  readTimeoutMs: number;
  maxRetries: number;
  credentialProvider?: CredentialProvider;
  httpClient: HttpClient;
  registry: ModelRegistry;
  clock?: () => Date;
  sleep: (ms: number) => Promise<void>;
  invocationId: () => string;
  userAgent: string;

  constructor(opts: ConfigurationOptions = {}) {
    this.ak = opts.ak;
    this.sk = opts.sk;
    this.sessionToken = opts.sessionToken;
    this.region = opts.region ?? "ap-southeast-1";
    this.host = opts.host;
    this.scheme = opts.scheme ?? "https";
    this.useDualStack = opts.useDualStack;
    this.connectTimeoutMs = opts.connectTimeoutMs ?? 30000;
    this.readTimeoutMs = opts.readTimeoutMs ?? 30000;
    this.maxRetries = opts.maxRetries ?? 3;
    this.credentialProvider = opts.credentialProvider;
    this.httpClient = opts.httpClient ?? fetchHttpClient;
    this.registry = opts.registry ?? defaultRegistry;
    this.clock = opts.clock;
    this.sleep = opts.sleep ?? realSleep;
    this.invocationId = opts.invocationId ?? (() => randomUUID());
    this.userAgent = opts.userAgent ?? "byteplus-node-sdk-v2/0.0.0";
  }
}
