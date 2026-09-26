import { describe, expect, it } from "vitest";

import { postCreateCommands } from "./post-create.js";

describe("postCreateCommands", () => {
  it("uses the selected manager and qualified test command for Vite", () => {
    expect(
      postCreateCommands({
        schemaVersion: 1,
        project: { name: "demo" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "react-vite" },
        integrations: [{ id: "vitest" }],
      }),
    ).toEqual(["pnpm dev", "pnpm build", "pnpm exec vitest run"]);
  });

  it("prints the Express package scripts and Vitest command", () => {
    expect(
      postCreateCommands({
        schemaVersion: 1,
        project: { name: "demo" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "express", options: { typescript: true } },
        integrations: [{ id: "vitest" }],
      }),
    ).toEqual(["pnpm dev", "pnpm build", "pnpm start", "pnpm exec vitest run"]);
  });

  it("prints the same scripts for a TypeScript Fastify app", () => {
    expect(
      postCreateCommands({
        schemaVersion: 1,
        project: { name: "demo" },
        runtime: { id: "node" },
        packageManager: "pnpm",
        framework: { id: "fastify", options: { typescript: true } },
        integrations: [{ id: "vitest" }],
      }),
    ).toEqual(["pnpm dev", "pnpm build", "pnpm start", "pnpm exec vitest run"]);
  });
});
