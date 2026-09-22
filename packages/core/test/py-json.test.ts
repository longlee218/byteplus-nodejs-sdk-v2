import { describe, it, expect } from "vitest";
import { pyJsonStringify } from "../src/index.js";

// Expected values are the exact output of Python `json.dumps(...)` (default
// options): item sep ", ", key sep ": ", ensure_ascii (non-ASCII -> \uXXXX,
// astral chars -> surrogate pair). This is what makes the signed body match.
describe("pyJsonStringify matches Python json.dumps", () => {
  const cases: Array<[unknown, string]> = [
    [{ a: 1, b: 2 }, '{"a": 1, "b": 2}'],
    [{ x: { y: "z" } }, '{"x": {"y": "z"}}'],
    [[1, 2, "x"], '[1, 2, "x"]'],
    ["café", '"caf\\u00e9"'],
    [{ t: true, f: false }, '{"t": true, "f": false}'],
    [{}, "{}"],
    [[], "[]"],
    [{ emoji: "A\u{1F600}B" }, '{"emoji": "A\\ud83d\\ude00B"}'],
  ];
  for (const [input, expected] of cases) {
    it(JSON.stringify(input) ?? "value", () => {
      expect(pyJsonStringify(input)).toBe(expected);
    });
  }

  it("drops undefined keys (pre-sanitized input, like the transport serializer)", () => {
    expect(pyJsonStringify({ a: 1, b: undefined })).toBe('{"a": 1}');
  });
});
