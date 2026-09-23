import { describe, it, expect } from "vitest";
import { serializeParams } from "../src/index.js";

describe("serializeParams (Python wrapper parity)", () => {
  it("keeps scalar strings as-is", () => {
    expect(serializeParams({ Vid: "v-1", SpaceName: "s" })).toEqual({ Vid: "v-1", SpaceName: "s" });
  });

  it("stringifies numbers with Python str() semantics", () => {
    expect(serializeParams({ Offset: 0, Size: 20 })).toEqual({ Offset: "0", Size: "20" });
  });

  it("renders top-level booleans as Python str(bool)", () => {
    expect(serializeParams({ NeedThumb: true, Draft: false })).toEqual({ NeedThumb: "True", Draft: "False" });
  });

  it("json.dumps-encodes nested objects with Python spacing", () => {
    // Python json.dumps({"A":1,"B":"x"}) -> '{"A": 1, "B": "x"}'
    expect(serializeParams({ Filter: { A: 1, B: "x" } })).toEqual({ Filter: '{"A": 1, "B": "x"}' });
  });

  it("json.dumps-encodes arrays with ', ' separators", () => {
    expect(serializeParams({ Vids: ["a", "b"] })).toEqual({ Vids: '["a", "b"]' });
  });

  it("drops undefined / null entries", () => {
    expect(serializeParams({ A: "x", B: undefined, C: null })).toEqual({ A: "x" });
  });

  it("returns an empty object for undefined input", () => {
    expect(serializeParams(undefined)).toEqual({});
  });
});
