import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { IntegrationDefinition } from "../integrations/definition.js";
import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { planAdd, planAddMany } from "./plan-add.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function lookup(definitions: IntegrationDefinition[]): RegistryLookup {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  return {
    get(id) {
      return byId.get(id);
    },
    list() {
      return [...byId.values()];
    },
    byCategory(category) {
      return [...byId.values()].filter((definition) => definition.category === category);
    },
  };
}

const node = fakeIntegration({
  id: "node",
  category: "runtime",
  detect: async (context) => ({
    detected: await context.files.exists("package.json"),
    confidence: "certain",
    evidence: [],
  }),
});

const pnpm = fakeIntegration({
  id: "pnpm",
  category: "package-manager",
  detect: async (context) => ({
    detected: await context.files.exists("pnpm-lock.yaml"),
    confidence: "certain",
    evidence: [],
  }),
});

const nextjs = fakeIntegration({
  id: "nextjs",
  name: "Next.js",
  category: "framework",
  detect: async (context) => ({
    detected: context.packageJson?.dependencies.next !== undefined,
    confidence: "certain",
    evidence: [],
  }),
  plan: () => [
    {
      type: "run_command",
      command: "pnpm",
      args: ["create", "next-app@latest", ".", "--yes"],
      cwd: ".",
      description: "Scaffold Next.js with create-next-app",
    },
  ],
});

const sqlite = fakeIntegration({
  id: "sqlite",
  category: "database",
  detect: async (context) => {
    const schema = await context.files.readText("prisma/schema.prisma");
    return {
      detected: schema !== undefined && schema.includes('provider = "sqlite"'),
      confidence: "certain",
      evidence: [],
    };
  },
});

const zod = fakeIntegration({
  id: "zod",
  category: "validation",
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Zod is installed into the app.",
    },
  ],
  plan: () => [
    {
      type: "run_command",
      command: "pnpm",
      args: ["add", "zod"],
      cwd: ".",
      description: "Install Zod",
    },
  ],
});

const prisma = fakeIntegration({
  id: "prisma",
  category: "orm",
  addable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "category", category: "database" },
      reason: "Prisma needs a database.",
    },
    {
      kind: "requires",
      target: { type: "category", category: "framework" },
      reason: "Prisma is added to the app.",
    },
  ],
  supports(context) {
    if (!context.integrationIds.includes("sqlite")) {
      return { supported: false, reason: "SQLite only." };
    }
    return { supported: true };
  },
  plan: () => [
    {
      type: "run_command",
      command: "pnpm",
      args: ["add", "--save-dev", "prisma"],
      cwd: ".",
      description: "Install Prisma CLI",
    },
    {
      type: "create_file",
      path: "lib/prisma.ts",
      content: "export {}\n",
      behavior: "fail_if_exists",
      description: "Add Prisma helper",
    },
  ],
});

const registry = lookup([node, pnpm, nextjs, sqlite, zod, prisma]);

async function nextFixture(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-add-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "package.json"),
    extra["package.json"] ?? JSON.stringify({ name: "demo-app", dependencies: { next: "16.0.0" } }),
  );
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(path.join(root, "next.config.mjs"), "export default {};\n");
  for (const [relative, content] of Object.entries(extra)) {
    if (relative === "package.json") {
      continue;
    }
    const full = path.join(root, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

describe("planAdd", () => {
  it("rejects unknown and non-addable integrations", async () => {
    const root = await nextFixture();
    const unknown = await planAdd({ startDir: root, integrationId: "nope", registry });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) {
      return;
    }
    expect(unknown.error.code).toBe("UNKNOWN_INTEGRATION");

    const framework = await planAdd({ startDir: root, integrationId: "nextjs", registry });
    expect(framework.ok).toBe(false);
    if (framework.ok) {
      return;
    }
    expect(framework.error.code).toBe("UNSUPPORTED_CONTEXT");
  });

  it("refuses an ambiguous pnpm workspace root before planning", async () => {
    const root = await nextFixture({ "pnpm-workspace.yaml": "packages:\n  - apps/*\n" });
    const result = await planAdd({ startDir: root, integrationId: "zod", registry });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toMatchObject({ code: "UNSUPPORTED_CONTEXT" });
    expect(result.error.message).toContain("workspace root");
  });

  it("plans only the requested addable integration", async () => {
    const root = await nextFixture();
    const result = await planAdd({ startDir: root, integrationId: "zod", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.valid).toBe(true);
    expect(result.result.orderedIntegrations.map((item) => item.id)).toEqual(["zod"]);
    expect(result.result.operations).toEqual([
      expect.objectContaining({
        type: "run_command",
        args: ["add", "zod"],
      }),
    ]);
    expect(
      result.result.operations.some(
        (operation) => operation.type === "run_command" && operation.args.includes("create"),
      ),
    ).toBe(false);
  });

  it("plans multiple integrations in one resolved delta", async () => {
    const root = await nextFixture({
      "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
    });
    const result = await planAddMany({
      startDir: root,
      integrationIds: ["zod", "prisma", "zod"],
      registry,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.valid).toBe(true);
    expect(result.result.orderedIntegrations.map((item) => item.id)).toEqual(["prisma", "zod"]);
    expect(result.result.operations.map((operation) => operation.description)).toEqual([
      "Install Prisma CLI",
      "Add Prisma helper",
      "Install Zod",
    ]);
  });

  it("reports a no-op when the integration is already installed", async () => {
    const root = await nextFixture({
      "package.json": JSON.stringify({
        name: "demo-app",
        dependencies: { next: "16.0.0", zod: "4.0.0" },
      }),
    });
    const result = await planAdd({ startDir: root, integrationId: "zod", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(true);
    expect(result.result.operations).toEqual([]);
  });

  it("requires a detected database before adding Prisma", async () => {
    const root = await nextFixture();
    const result = await planAdd({ startDir: root, integrationId: "prisma", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(false);
    expect(result.result.errors[0]?.code).toBe("MISSING_REQUIREMENT");
  });

  it("plans missing Prisma files when SQLite is already present", async () => {
    const root = await nextFixture({
      "prisma/schema.prisma": 'datasource db {\n  provider = "sqlite"\n}\n',
    });
    const result = await planAdd({ startDir: root, integrationId: "prisma", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(true);
    expect(result.result.operations.map((operation) => operation.description)).toEqual([
      "Install Prisma CLI",
      "Add Prisma helper",
    ]);
  });
});
