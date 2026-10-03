import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/selection-add.test.ts"],
    testTimeout: 900_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
