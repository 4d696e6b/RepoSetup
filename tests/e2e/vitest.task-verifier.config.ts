import { defineConfig } from "vitest/config";
/** Expensive serial immutable-closure qualification, separate from ordinary contract CI. */
export default defineConfig({
  test: {
    include: ["tests/e2e/task-verifier.test.ts", "tests/e2e/task-managed-fixture.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 600000,
    hookTimeout: 180000,
  },
});
