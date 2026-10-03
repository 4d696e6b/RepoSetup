import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/handoff.test.ts"], testTimeout: 60000 } });
