import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // CommonJS output as .js, ESM as .mjs, matching package.json `exports`.
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
});
