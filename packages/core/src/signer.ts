// BytePlus SignatureV4 signer — a byte-identical port of the Python SDK's
// `byteplussdkcore/signv4.py` (SignerV4). See
// docs/product/reference-byteplus-python-sdk/signing.md for the authoritative algorithm
// and docs/product/signing.md for the product guarantee.

import { createHash, createHmac } from "node:crypto";
import { canonicalQuery, compareTuple, urlencode } from "./encoding.js";

export interface SignableRequest {
  path: string;
  method: string;
  /** Mutated in place: the signer adds X-Date, X-Content-Sha256, Authorization. */
  headers: Record<string, string>;
  /** Already-serialized body string ("" if none). Signed and sent must match. */
  body: string;
  /** Form params for POST x-www-form-urlencoded; replaces the body when present. */
  postParams?: Array<[string, string]>;
  query?: Record<string, string>;
}

export interface SignCredentials {
  ak: string;
  sk: string;
  sessionToken?: string;
}

export interface SignContext {
  region: string;
  service: string;
  /** Injectable clock; defaults to the real time. Enables deterministic tests. */
  clock?: () => Date;
}

/** Signing intermediates, returned for inspection/testing. */
export interface SignComponents {
  canonicalRequest: string;
  stringToSign: string;
  signature: string;
}

const SIGNED_HEADER_ALLOW = new Set(["Content-Type", "Content-Md5", "Host"]);

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function hmacRaw(key: Buffer | string, msg: string): Buffer {
  return createHmac("sha256", key).update(msg, "utf8").digest();
}

function formatDate(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

/** Nested HMAC signing-key derivation (Python get_signing_secret_key_v4). */
export function getSigningKey(sk: string, date8: string, region: string, service: string): Buffer {
  const kDate = hmacRaw(sk, date8);
  const kRegion = hmacRaw(kDate, region);
  const kService = hmacRaw(kRegion, service);
  return hmacRaw(kService, "request");
}

function signature(stringToSign: string, sk: string, date8: string, region: string, service: string): string {
  const signingKey = getSigningKey(sk, date8, region, service);
  return createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
}

/**
 * Sign a request in place (BytePlus SignatureV4). Mutates `req.headers`,
 * adding X-Date, X-Content-Sha256, optionally X-Security-Token, and
 * Authorization — byte-identical to the Python SDK's SignerV4.sign. Also
 * returns the signing intermediates (the Python signer returns nothing; the
 * extra return is inspection-only and does not change the header side effects).
 */
export function signV4(req: SignableRequest, creds: SignCredentials, ctx: SignContext): SignComponents {
  const { headers } = req;
  let { body } = req;
  const path = req.path === "" ? "/" : req.path;
  const query = req.query ?? {};

  if (req.method !== "GET" && !("Content-Type" in headers)) {
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";
  }

  const formatted = formatDate((ctx.clock ?? (() => new Date()))());
  headers["X-Date"] = formatted;

  const ct = headers["Content-Type"];
  if (
    req.method === "POST" &&
    ct !== undefined &&
    ct.startsWith("application/x-www-form-urlencoded") &&
    req.postParams &&
    req.postParams.length > 0
  ) {
    body = urlencode(req.postParams);
  }

  const bodyHash = sha256Hex(body);
  headers["X-Content-Sha256"] = bodyHash;
  if (creds.sessionToken) {
    headers["X-Security-Token"] = creds.sessionToken;
  }

  // Select signed headers: Content-Type / Content-Md5 / Host or any X-*.
  const signed: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    if (SIGNED_HEADER_ALLOW.has(key) || key.startsWith("X-")) {
      signed[key.toLowerCase()] = headers[key] as string;
    }
  }
  if (signed["host"] !== undefined) {
    const v = signed["host"];
    const colon = v.indexOf(":");
    if (colon !== -1) {
      const port = v.slice(colon + 1);
      if (port === "80" || port === "443") signed["host"] = v.slice(0, colon);
    }
  }

  const sortedKeys = Object.keys(signed).sort();
  const signedStr = sortedKeys.map((k) => `${k}:${signed[k]}\n`).join("");
  const signedHeadersString = sortedKeys.join(";");

  const canonicalRequest = [
    req.method,
    path,
    canonicalQuery(query),
    signedStr,
    signedHeadersString,
    bodyHash,
  ].join("\n");

  const date8 = formatted.slice(0, 8);
  const credentialScope = `${date8}/${ctx.region}/${ctx.service}/request`;
  const stringToSign = ["HMAC-SHA256", formatted, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const sig = signature(stringToSign, creds.sk, date8, ctx.region, ctx.service);

  headers["Authorization"] =
    `HMAC-SHA256 Credential=${creds.ak}/${credentialScope}, SignedHeaders=${signedHeadersString}, Signature=${sig}`;

  return { canonicalRequest, stringToSign, signature: sig };
}

export interface SignUrlArgs {
  path: string;
  method: string;
  query: Record<string, string>;
  host?: string;
  clock?: () => Date;
}

/**
 * Presigned query-string signing (Python SignerV4.sign_url). Returns the
 * encoded query string including X-Signature.
 */
export function signUrl(args: SignUrlArgs, creds: SignCredentials, ctx: SignContext): string {
  const formatted = formatDate((args.clock ?? ctx.clock ?? (() => new Date()))());
  const date8 = formatted.slice(0, 8);
  const credentialScope = `${date8}/${ctx.region}/${ctx.service}/request`;
  const signHost = args.host !== undefined && args.host !== "";

  const query: Record<string, string> = { ...args.query };
  query["X-Date"] = formatted;
  query["X-NotSignBody"] = "";
  query["X-Credential"] = `${creds.ak}/${credentialScope}`;
  query["X-Algorithm"] = "HMAC-SHA256";
  query["X-SignedHeaders"] = signHost ? "host" : "";
  // Seed the key so it is counted in its own sorted signed-query set, then fill
  // it with the sorted key list — mirrors the reference's two-step assignment.
  query["X-SignedQueries"] = "";
  query["X-SignedQueries"] = Object.keys(query).sort().join(";");
  const signedQueryKeys = new Set(Object.keys(query));

  // Token is added AFTER X-SignedQueries and excluded from the canonical query.
  if (creds.sessionToken) query["X-Security-Token"] = creds.sessionToken;

  const bodyHash = sha256Hex("");
  const canonicalQueryParams: Record<string, string> = {};
  for (const k of Object.keys(query)) {
    if (signedQueryKeys.has(k)) canonicalQueryParams[k] = query[k] as string;
  }

  const canonicalRequest = signHost
    ? [args.method, args.path, canonicalQuery(canonicalQueryParams), `host:${args.host}\n`, "host", bodyHash].join("\n")
    : [args.method, args.path, canonicalQuery(canonicalQueryParams), "\n", "", bodyHash].join("\n");

  const stringToSign = ["HMAC-SHA256", formatted, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  query["X-Signature"] = signature(stringToSign, creds.sk, date8, ctx.region, ctx.service);

  const pairs = Object.entries(query).sort(compareTuple);
  return urlencode(pairs);
}
