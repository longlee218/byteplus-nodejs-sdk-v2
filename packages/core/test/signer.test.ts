import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { signV4, signUrl, pctEncode, canonicalQuery, getSigningKey, type SignContext } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(
  readFileSync(resolve(here, "fixtures/sign-vectors.json"), "utf8"),
) as SignVectors;

interface SignVectors {
  provenance: { frozen_utc: string; ak: string; sk: string; region: string; service: string; signingKeyHex: string };
  pctEncode: Array<{ input: string; expected: string }>;
  canonicalQuery: Array<{ input: Record<string, string>; expected: string }>;
  sign: Array<{
    name: string;
    input: {
      path: string;
      method: string;
      headers: Record<string, string>;
      body: string;
      postParams: Array<[string, string]>;
      query: Record<string, string>;
      sessionToken: string | null;
    };
    expected: { headers: Record<string, string>; canonicalRequest: string; stringToSign: string; signature: string };
  }>;
  signUrl: Array<{
    name: string;
    input: { path: string; method: string; query: Record<string, string>; host: string | null; sessionToken: string | null };
    expected: { queryString: string };
  }>;
}

// Frozen clock matching the generator's FIXED datetime(2025,7,1,12,34,56) UTC.
const FIXED = new Date(Date.UTC(2025, 6, 1, 12, 34, 56));
const ctx: SignContext = {
  region: vectors.provenance.region,
  service: vectors.provenance.service,
  clock: () => FIXED,
};
const creds = (token: string | null) => ({
  ak: vectors.provenance.ak,
  sk: vectors.provenance.sk,
  sessionToken: token ?? undefined,
});

describe("signV4 matches the Python SDK reference vectors", () => {
  for (const v of vectors.sign) {
    it(v.name, () => {
      const headers = { ...v.input.headers };
      const components = signV4(
        {
          path: v.input.path,
          method: v.input.method,
          headers,
          body: v.input.body,
          postParams: v.input.postParams,
          query: v.input.query,
        },
        creds(v.input.sessionToken),
        ctx,
      );
      expect(headers).toEqual(v.expected.headers);
      expect(components.canonicalRequest).toBe(v.expected.canonicalRequest);
      expect(components.stringToSign).toBe(v.expected.stringToSign);
      expect(components.signature).toBe(v.expected.signature);
    });
  }
});

describe("pctEncode matches Python quote(safe='-_.~')", () => {
  for (const v of vectors.pctEncode) {
    it(JSON.stringify(v.input), () => {
      expect(pctEncode(v.input)).toBe(v.expected);
    });
  }
});

describe("canonicalQuery matches Python SignerV4.canonical_query", () => {
  for (const v of vectors.canonicalQuery) {
    it(JSON.stringify(v.input), () => {
      expect(canonicalQuery(v.input)).toBe(v.expected);
    });
  }
});

it("getSigningKey matches the Python key-derivation intermediate", () => {
  const date8 = vectors.provenance.frozen_utc.slice(0, 8);
  const key = getSigningKey(vectors.provenance.sk, date8, vectors.provenance.region, vectors.provenance.service);
  expect(key.toString("hex")).toBe(vectors.provenance.signingKeyHex);
});

describe("signUrl matches the Python SDK reference vectors", () => {
  for (const v of vectors.signUrl) {
    it(v.name, () => {
      const qs = signUrl(
        {
          path: v.input.path,
          method: v.input.method,
          query: v.input.query,
          host: v.input.host ?? undefined,
          clock: () => FIXED,
        },
        creds(v.input.sessionToken),
        ctx,
      );
      expect(qs).toBe(v.expected.queryString);
    });
  }
});
