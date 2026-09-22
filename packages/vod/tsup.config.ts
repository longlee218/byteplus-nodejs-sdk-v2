import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  tsconfig: "tsconfig.build.json",
  dts: true,
  clean: true,
  sourcemap: true,
  // Do not bundle the core package; consumers install it alongside.
  external: ["@byteplus-sdk/core"],
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" };
  },
});
