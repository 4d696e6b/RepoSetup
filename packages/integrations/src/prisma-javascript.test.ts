import { type PlanContext } from "@reposetup/core";
import { describe, expect, it } from "vitest";

import { prismaIntegration } from "./prisma.js";

function context(framework: string, database: string, typescript: boolean): PlanContext {
  return {
    config: {
      schemaVersion: 1,
      project: { name: "prisma-app" },
      runtime: { id: "node" },
      packageManager: "pnpm",
      framework: { id: framework, options: { typescript } },
      integrations: [{ id: database }, { id: "prisma" }],
    },
    options: {},
    projectRoot: ".",
  };
}

describe("Prisma helper language and generated imports", () => {
  const cases = ["express", "fastify", "nextjs", "react-vite"].flatMap((framework) =>
    ["sqlite", "postgresql"].map((database) => ({ framework, database })),
  );
  it.each(cases)(
    "$framework / $database / JavaScript uses real generated TypeScript paths with Node 24",
    ({ framework, database }) => {
      const operations = prismaIntegration.plan(context(framework, database, false));
      const configured = operations.findIndex((operation) => operation.type === "modify_text");
      const generated = operations.findIndex(
        (operation) => operation.type === "run_command" && operation.args.includes("generate"),
      );
      expect(configured).toBeGreaterThan(0);
      expect(configured).toBeLessThan(generated);
      expect(operations[configured]).toEqual(
        expect.objectContaining({
          type: "modify_text",
          path: "prisma/schema.prisma",
          oldText: '  output   = "../generated/prisma"',
          newText: expect.stringContaining('importFileExtension = "ts"'),
        }),
      );
      expect(operations).toContainEqual(
        expect.objectContaining({
          type: "create_file",
          path: "lib/prisma.js",
          behavior: "fail_if_exists",
          content: expect.stringContaining('../generated/prisma/client.ts"'),
        }),
      );
      expect(operations).not.toContainEqual(
        expect.objectContaining({ type: "create_file", path: "lib/prisma.ts" }),
      );
    },
  );

  it.each(cases)(
    "$framework / $database / TypeScript keeps compile-ready .js imports",
    ({ framework, database }) => {
      const operations = prismaIntegration.plan(context(framework, database, true));
      expect(operations.some((operation) => operation.type === "modify_text")).toBe(false);
      expect(operations).toContainEqual(
        expect.objectContaining({
          type: "create_file",
          path: "lib/prisma.ts",
          content: expect.stringContaining('../generated/prisma/client.js"'),
        }),
      );
    },
  );
});
