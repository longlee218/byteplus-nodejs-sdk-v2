// STS2 token minting — port of base Service.sign_sts2 + byteplus_sdk/Policy.py.
// Produces a scoped upload credential (SecurityToken2). Output is
// non-deterministic (random AK/SK), so it is tested structurally.

import { createHash, createHmac, createCipheriv, randomUUID } from "node:crypto";

const LETTER_RUNES = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface Statement {
  Effect: string;
  Action: string[];
  Resource: string[];
}
export interface Policy {
  statements: Statement[];
}

/** Build an Allow statement (Python `Statement.new_allow_statement`). */
export function allowStatement(actions: string[], resources: string[] = []): Statement {
  return { Effect: "Allow", Action: actions, Resource: resources };
}

export interface SecurityToken2 {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  ExpiredTime: string;
  CurrentTime: string;
}

/** AES-128-CBC (IV = key) with Python `Util.pad` zero-padding, base64. */
function aesCbcZeroPadB64(plaintext: string, key: Buffer): string {
  const data = Buffer.from(plaintext, "utf-8");
  const padLen = 16 - (data.length % 16); // Python always pads (16 when aligned)
  const padded = Buffer.concat([data, Buffer.alloc(padLen, 0)]);
  const cipher = createCipheriv("aes-128-cbc", key, key);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString("base64");
}

/** Python `Util.generate_access_key_id(prefix)`. */
function generateAccessKeyId(prefix: string): string {
  const uid = randomUUID().replace(/-/g, "");
  const b64 = Buffer.from(uid, "utf-8").toString("base64");
  return prefix + b64.replace(/[=/+-]/g, "");
}

/** Python `Util.generate_secret_key`: 32 unique letters, AES-encrypted. */
function generateSecretKey(): string {
  const arr = LETTER_RUNES.split("");
  for (let i = 0; i < 32; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return aesCbcZeroPadB64(arr.slice(0, 32).join(""), Buffer.from("bytedance-isgood", "utf-8"));
}

/** Compact JSON with recursively sorted keys — Python `json.dumps(sort_keys=True).replace(' ','')`. */
function sortedCompactJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(sortedCompactJson).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const parts = Object.keys(obj)
    .sort()
    .map((k) => JSON.stringify(k) + ":" + sortedCompactJson(obj[k]));
  return "{" + parts.join(",") + "}";
}

function toRfc3339(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const oh = p(Math.floor(Math.abs(off) / 60));
  const om = p(Math.abs(off) % 60);
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sign}${oh}:${om}`
  );
}

/**
 * Mint an STS2 token (port of `sign_sts2`). `nowSeconds` is injectable for tests.
 */
export function mintSts2(ak: string, sk: string, policy: Policy | null, expire: number, nowSeconds?: number): SecurityToken2 {
  const key = createHash("md5").update(sk, "utf-8").digest(); // 16 bytes
  const accessKeyId = generateAccessKeyId("AKTP");
  const secretAccessKey = generateSecretKey();
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const exp = now + (expire < 60 ? 60 : expire);

  const policyString =
    policy === null ? "" : sortedCompactJson({ Statement: policy.statements });
  const signedSecretAccessKey = aesCbcZeroPadB64(secretAccessKey, key);

  const signStr = [ak, accessKeyId, exp, signedSecretAccessKey, policyString].join("|");
  const signature = createHmac("sha256", key).update(signStr, "utf-8").digest("hex");

  const innerToken = {
    LTAccessKeyId: ak,
    AccessKeyId: accessKeyId,
    SignedSecretAccessKey: signedSecretAccessKey,
    ExpiredTime: exp,
    PolicyString: policyString,
    Signature: signature,
  };
  const sessionToken = "STS2" + Buffer.from(sortedCompactJson(innerToken), "utf-8").toString("base64");

  return {
    AccessKeyId: accessKeyId,
    SecretAccessKey: secretAccessKey,
    SessionToken: sessionToken,
    ExpiredTime: toRfc3339(exp),
    CurrentTime: toRfc3339(now),
  };
}
