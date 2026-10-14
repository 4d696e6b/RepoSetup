import { defineConfig } from "vitest/config";

/** Serial real-tool acceptance; outer timers cover several independently bounded runs. */
export default defineConfig({
  test: {
    include: ["src/tasks/verification-adapter.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    // Covers full-tool fixture setup and several independently bounded checks.
    testTimeout: 600_000,
  },
});
