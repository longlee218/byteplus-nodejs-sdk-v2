import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only this SDK's package tests — never the repo's harness/skill scripts.
    include: ["packages/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**", ".agents/**"],
  },
});
