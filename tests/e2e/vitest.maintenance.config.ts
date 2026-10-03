import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/maintenance-packed.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
