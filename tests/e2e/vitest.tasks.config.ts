import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/e2e/task-*.test.ts"],
    exclude: ["tests/e2e/task-verifier.test.ts", "tests/e2e/task-managed-fixture.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 120000,
    hookTimeout: 180000,
  },
});
