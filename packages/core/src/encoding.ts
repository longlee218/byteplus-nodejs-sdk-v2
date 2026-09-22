// Percent-encoding + query canonicalization, ported to match Python's
// urllib.parse behavior byte-for-byte. Kept separate from signer.ts so each
// stays small and independently testable. See
// docs/product/reference-byteplus-python-sdk/signing.md.

/** Python `urllib.parse.quote(safe='-_.~')`: keep alnum + `-._~`, else %XX (UTF-8). */
export function pctEncode(value: string): string {
  const bytes = Buffer.from(value, "utf8");
  let out = "";
  for (const b of bytes) {
    if (
      (b >= 0x41 && b <= 0x5a) || // A-Z
      (b >= 0x61 && b <= 0x7a) || // a-z
      (b >= 0x30 && b <= 0x39) || // 0-9
      b === 0x2d || // -
      b === 0x2e || // .
      b === 0x5f || // _
      b === 0x7e // ~
    ) {
      out += String.fromCharCode(b);
    } else {
      out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

/** Python `quote_plus`: like pctEncode but space -> '+'. */
export function quotePlus(value: string): string {
  return pctEncode(value).replace(/%20/g, "+");
}

/** Python `urlencode(pairs)` (quote_plus for keys and values). */
export function urlencode(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${quotePlus(k)}=${quotePlus(v)}`).join("&");
}

/** Lexicographic compare of [key, value] tuples (Python tuple sort). */
export function compareTuple(a: [string, string], b: [string, string]): number {
  if (a[0] < b[0]) return -1;
  if (a[0] > b[0]) return 1;
  if (a[1] < b[1]) return -1;
  if (a[1] > b[1]) return 1;
  return 0;
}

/** Mirror of Python SignerV4.canonical_query. */
export function canonicalQuery(query: Record<string, string>): string {
  const encoded = Object.keys(query).map(
    (k) => [pctEncode(k), pctEncode(String(query[k]))] as [string, string],
  );
  encoded.sort(compareTuple);
  return encoded.map(([k, v]) => `${k}=${v}`).join("&");
}
