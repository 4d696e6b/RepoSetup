import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/usability-session.test.ts"],
    testTimeout: 900_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
