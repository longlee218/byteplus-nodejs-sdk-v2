import { describe, it, expect } from "vitest";
import { ModelRegistry, serializeByType, deserializeByType } from "@byteplus-sdk/core";
import { startExecutionMetas } from "../src/models/start-execution-metas.js";
import { getExecutionMetas } from "../src/models/get-execution-metas.js";

const allMetas = { ...startExecutionMetas, ...getExecutionMetas };

function registry(): ModelRegistry {
  const r = new ModelRegistry();
  for (const [name, meta] of Object.entries(allMetas)) r.register(name, meta);
  return r;
}

const PRIMITIVES = new Set(["str", "int", "float", "bool"]);
function listInner(t: string): string | undefined {
  return t.startsWith("list[") && t.endsWith("]") ? t.slice(5, -1) : undefined;
}

const reg = registry();

// Build a fully-populated camelCase sample object for a model type by walking
// its swaggerTypes, recursing into nested models and list[...].
function sample(type: string): unknown {
  const inner = listInner(type);
  if (inner) return [sample(inner)];
  if (type === "str") return "s";
  if (type === "int") return 3;
  if (type === "float") return 1.5;
  if (type === "bool") return true;
  const meta = reg.get(type);
  if (!meta) throw new Error(`unregistered type ${type}`);
  const obj: Record<string, unknown> = {};
  for (const [attr, t] of Object.entries(meta.swaggerTypes)) obj[attr] = sample(t);
  return obj;
}

describe("VOD models: all 29 registered (no passthrough)", () => {
  it("registers exactly the 29 Python models", () => {
    expect(Object.keys(allMetas)).toHaveLength(29);
  });

  it("every nested swaggerType references a registered model (recursion never hits passthrough)", () => {
    for (const meta of Object.values(allMetas)) {
      for (const t of Object.values(meta.swaggerTypes)) {
        const base = listInner(t) ?? t;
        if (PRIMITIVES.has(base)) continue;
        expect(reg.has(base), `${base} must be registered`).toBe(true);
      }
    }
  });
});

describe("VOD models: per-model camelCase <-> PascalCase round-trip", () => {
  for (const name of Object.keys(allMetas)) {
    it(`${name} serializes to PascalCase and deserializes back`, () => {
      const src = sample(name) as Record<string, unknown>;
      const wire = serializeByType(src, name, reg);
      // no camelCase attr leaked to the wire: every top-level wire key is PascalCase.
      for (const k of Object.keys(wire as Record<string, unknown>)) {
        expect(k[0]).toBe(k[0]?.toUpperCase());
      }
      expect(deserializeByType(wire, name, reg)).toEqual(src);
    });
  }
});

describe("VOD models: deep StartExecution nesting renames at every depth", () => {
  it("operation.task.enhance.moeEnhance.target.resLimit -> Operation.Task.Enhance.MoeEnhance.Target.ResLimit", () => {
    const req = {
      operation: { task: { enhance: { moeEnhance: { target: { resLimit: 1080 } } } } },
    };
    const wire = serializeByType(req, "StartExecutionRequest", reg) as Record<string, any>;
    expect(wire.Operation.Task.Enhance.MoeEnhance.Target.ResLimit).toBe(1080);
    // round-trips back to idiomatic camelCase.
    expect(deserializeByType(wire, "StartExecutionRequest", reg)).toEqual(req);
  });

  it("renames list[Module] entries (Enhance.modules -> Modules[].Type)", () => {
    const req = { operation: { task: { enhance: { modules: [{ type: "m1" }, { type: "m2" }] } } } };
    const wire = serializeByType(req, "StartExecutionRequest", reg) as Record<string, any>;
    expect(wire.Operation.Task.Enhance.Modules).toEqual([{ Type: "m1" }, { Type: "m2" }]);
  });

  it("deserializes a nested GetExecution output tree (Convert -> streams) back to camelCase", () => {
    const wire = {
      RunId: "r-1",
      Output: { Task: { Enhance: { AudioStreamMeta: { SampleRate: 48000 }, VideoStreamMeta: { Width: 1920 } } } },
    };
    expect(deserializeByType(wire, "GetExecutionResponse", reg)).toEqual({
      runId: "r-1",
      output: { task: { enhance: { audioStreamMeta: { sampleRate: 48000 }, videoStreamMeta: { width: 1920 } } } },
    });
  });
});
