import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/e2e/task-*.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 120000,
    hookTimeout: 180000,
  },
});
