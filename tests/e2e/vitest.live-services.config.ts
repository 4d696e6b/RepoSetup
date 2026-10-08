import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/live-services.test.ts"],
    testTimeout: 1_500_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
