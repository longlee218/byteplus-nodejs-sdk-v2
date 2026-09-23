// VodPlaybackV1 — playback RPC ops + client-side play-auth token builders.
// Ports the playback + token-generator methods of byteplus_sdk/vod/VodService.
// Composition over the dispatch core (repo rule).

import { createHmac } from "node:crypto";
import { getSigningKey, pyJsonStringify } from "@byteplus-sdk/core";
import type { VodV1Client } from "../client.js";
import type {
  GetPlayInfoRequest,
  GetPlayInfoResponse,
  GetPrivateDrmPlayAuthRequest,
  GetPrivateDrmPlayAuthResponse,
  CreateHlsDecryptionKeyRequest,
  CreateHlsDecryptionKeyResponse,
  GetHlsDecryptionKeyRequest,
  GetHlsDecryptionKeyResponse,
} from "../models/playback.js";

const base64 = (s: string): string => Buffer.from(s, "utf-8").toString("base64");

/** UTC `YYYYMMDDTHHMMSSZ` for an epoch-seconds instant. */
function formatDeadline(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

export class VodPlaybackV1 {
  constructor(private readonly client: VodV1Client) {}

  // ---- RPC ops -------------------------------------------------------------

  /** GET RPC: sign, send, parse the full typed `{ResponseMetadata, Result}`. */
  private async rpc<T>(action: string, req: object): Promise<T> {
    return JSON.parse(await this.client.get(action, req as Record<string, unknown>)) as T;
  }

  getPlayInfo(req: GetPlayInfoRequest): Promise<GetPlayInfoResponse> {
    return this.rpc("GetPlayInfo", req);
  }

  getPrivateDrmPlayAuth(req: GetPrivateDrmPlayAuthRequest): Promise<GetPrivateDrmPlayAuthResponse> {
    return this.rpc("GetPrivateDrmPlayAuth", req);
  }

  createHlsDecryptionKey(req: CreateHlsDecryptionKeyRequest): Promise<CreateHlsDecryptionKeyResponse> {
    return this.rpc("CreateHlsDecryptionKey", req);
  }

  getHlsDecryptionKey(req: GetHlsDecryptionKeyRequest): Promise<GetHlsDecryptionKeyResponse> {
    return this.rpc("GetHlsDecryptionKey", req);
  }

  // ---- token builders (local, no network) ---------------------------------

  /** base64({"TokenVersion":"V2","GetPlayInfoToken":<signed url>}). */
  getPlayAuthToken(req: GetPlayInfoRequest, expire: number): string {
    const params = this.withExpires(req, expire);
    const token = this.client.getSignUrl("GetPlayInfo", params);
    return base64(pyJsonStringify({ TokenVersion: "V2", GetPlayInfoToken: token }));
  }

  /** The raw signed URL (Python returns it directly — no wrapper/base64). */
  getPrivateDrmPlayAuthToken(req: GetPrivateDrmPlayAuthRequest, expire: number): string {
    const params = this.withExpires(req, expire);
    return this.client.getSignUrl("GetPrivateDrmPlayAuth", params);
  }

  /**
   * Signed `GetHlsDecryptionKey` URL carrying a locally-minted `DrmAuthToken`.
   * Only `HMAC-SHA1` is supported (as in Python). The token's key is the
   * hex of the nested SignatureV4 signing key derived over `deadTime`+service
   * "vod".
   */
  createHlsDrmAuthToken(authAlgorithm: string, expireSeconds: number): string {
    if (expireSeconds === 0) throw new Error("invalid expire");
    if (authAlgorithm !== "HMAC-SHA1") throw new Error("invalid authAlgorithm");
    const { ak, sk, region } = this.client.signingMaterial();
    const deadline = this.client.now() + expireSeconds;
    const deadTime = formatDeadline(deadline);
    const key = getSigningKey(sk, deadTime, region, "vod").toString("hex");
    const signData = [authAlgorithm, "2.0", String(deadline)].join("&");
    const sign = createHmac("sha1", key).update(signData, "utf-8").digest("base64");
    const token = [authAlgorithm, "2.0", String(deadline), ak, sign].join(":");
    return this.client.getSignUrl("GetHlsDecryptionKey", {
      DrmAuthToken: token,
      "X-Expires": String(expireSeconds),
    });
  }

  getSha1HlsDrmAuthToken(expireSeconds: number): string {
    return this.createHlsDrmAuthToken("HMAC-SHA1", expireSeconds);
  }

  private withExpires(req: object, expire: number): Record<string, unknown> {
    const params: Record<string, unknown> = { ...(req as Record<string, unknown>) };
    // Python adds X-Expires only when expire > 0; getSignUrl serializes once.
    if (expire > 0) params["X-Expires"] = String(expire);
    return params;
  }
}
