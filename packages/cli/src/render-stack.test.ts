import { describe, expect, it } from "vitest";

import { renderStack } from "./render-stack.js";
import type { DetectedStack } from "@reposetup/core";

function stack(overrides: Partial<DetectedStack> = {}): DetectedStack {
  return {
    projectRoot: "/virtual/app",
    runtimes: [
      {
        id: "node",
        name: "Node.js",
        category: "runtime",
        confidence: "certain",
        evidence: [{ kind: "manifest", detail: "Found package.json", path: "package.json" }],
      },
    ],
    packageManagers: [
      {
        id: "pnpm",
        name: "pnpm",
        category: "package-manager",
        confidence: "certain",
        evidence: [{ kind: "lockfile", detail: "Found pnpm-lock.yaml", path: "pnpm-lock.yaml" }],
      },
    ],
    frameworks: [
      {
        id: "nextjs",
        name: "Next.js",
        category: "framework",
        confidence: "certain",
        evidence: [
          { kind: "dependency", detail: "package.json includes next", path: "package.json" },
        ],
      },
    ],
    language: {
      id: "typescript",
      confidence: "certain",
      evidence: [{ kind: "config", detail: "Found tsconfig.json", path: "tsconfig.json" }],
    },
    integrations: [
      {
        id: "tailwind",
        name: "Tailwind CSS",
        category: "styling",
        confidence: "certain",
        evidence: [],
      },
      {
        id: "sqlite",
        name: "SQLite",
        category: "database",
        confidence: "likely",
        evidence: [],
      },
      {
        id: "prisma",
        name: "Prisma",
        category: "orm",
        confidence: "certain",
        evidence: [],
      },
    ],
    warnings: [],
    ...overrides,
  };
}

describe("renderStack", () => {
  it("prints category labels and confidence only when not certain", () => {
    const output = renderStack(stack(), false);
    expect(output).toContain("Runtime");
    expect(output).toContain("Node.js");
    expect(output).toContain("Package mgr");
    expect(output).toContain("pnpm");
    expect(output).toContain("Framework");
    expect(output).toContain("Next.js");
    expect(output).toContain("Language");
    expect(output).toContain("TypeScript");
    expect(output).toContain("Tailwind CSS");
    expect(output).toContain("SQLite (likely)");
    expect(output).toContain("Prisma");
    expect(output).not.toContain("evidence:");
  });

  it("includes detection evidence in verbose output", () => {
    const output = renderStack(stack(), true);
    expect(output).toContain("Project root  /virtual/app");
    expect(output).toContain("Found pnpm-lock.yaml");
    expect(output).toContain("package.json includes next");
  });
});
