import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/selection-matrix.test.ts", "tests/e2e/selection-packed.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
