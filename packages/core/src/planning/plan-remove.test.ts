import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { UNSAFE_REMOVE_MESSAGE } from "../errors/unsafe-remove.js";
import type { IntegrationDefinition } from "../integrations/definition.js";
import { fakeIntegration } from "../resolution/fake-integration.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";

import { planRemove } from "./plan-remove.js";

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

const zod = fakeIntegration({
  id: "zod",
  category: "validation",
  removable: true,
  remove: () => [
    {
      type: "run_command",
      command: "pnpm",
      args: ["remove", "zod"],
      cwd: ".",
      description: "Remove Zod",
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

const prettier = fakeIntegration({
  id: "prettier",
  category: "formatting",
  removable: true,
  remove: () => [
    {
      type: "run_command",
      command: "pnpm",
      args: ["remove", "prettier"],
      cwd: ".",
      description: "Remove Prettier",
    },
    {
      type: "create_file",
      path: ".prettierrc",
      content: "{}\n",
      behavior: "fail_if_exists",
      description: "Must not reverse install file steps",
    },
    {
      type: "show_message",
      message: "Leave Prettier config in place",
      description: "Leave Prettier config files in place",
    },
  ],
  plan: () => [
    {
      type: "create_file",
      path: ".prettierrc",
      content: "{}\n",
      behavior: "fail_if_exists",
      description: "Add Prettier config",
    },
  ],
});

const prisma = fakeIntegration({
  id: "prisma",
  category: "orm",
  addable: true,
  plan: () => [
    {
      type: "create_file",
      path: "lib/prisma.ts",
      content: "export {}\n",
      behavior: "fail_if_exists",
      description: "Add Prisma helper",
    },
  ],
});

const helper = fakeIntegration({
  id: "helper",
  category: "utility",
  removable: true,
  detect: async (context) => ({
    detected: context.packageJson?.dependencies.helper !== undefined,
    confidence: "certain",
    evidence: [],
  }),
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "zod" },
      reason: "Needs Zod",
    },
  ],
  remove: () => [
    {
      type: "run_command",
      command: "pnpm",
      args: ["remove", "helper"],
      cwd: ".",
      description: "Remove helper",
    },
  ],
  plan: () => [],
});

const registry = lookup([nextjs, zod, prettier, prisma, helper]);

async function nextFixture(extra: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-remove-"));
  tempDirs.push(root);
  await writeFile(
    path.join(root, "package.json"),
    extra["package.json"] ??
      JSON.stringify({
        name: "demo-app",
        dependencies: { next: "16.0.0", zod: "4.0.0" },
        devDependencies: { prettier: "3.0.0" },
      }),
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

describe("planRemove", () => {
  it("rejects unknown and non-removable integrations without reversing plan()", async () => {
    const root = await nextFixture();
    const unknown = await planRemove({ startDir: root, integrationId: "nope", registry });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) {
      return;
    }
    expect(unknown.error.code).toBe("UNKNOWN_INTEGRATION");

    const unsafe = await planRemove({ startDir: root, integrationId: "prisma", registry });
    expect(unsafe.ok).toBe(false);
    if (unsafe.ok) {
      return;
    }
    expect(unsafe.error.code).toBe("UNSUPPORTED_CONTEXT");
    expect(unsafe.error.message).toBe(UNSAFE_REMOVE_MESSAGE);

    const framework = await planRemove({ startDir: root, integrationId: "nextjs", registry });
    expect(framework.ok).toBe(false);
    if (framework.ok) {
      return;
    }
    expect(framework.error.message).toBe(UNSAFE_REMOVE_MESSAGE);
  });

  it("plans only the explicit remove recipe", async () => {
    const root = await nextFixture();
    const result = await planRemove({ startDir: root, integrationId: "zod", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.valid).toBe(true);
    expect(result.result.orderedIntegrations.map((item) => item.id)).toEqual(["zod"]);
    expect(result.result.operations).toEqual([
      expect.objectContaining({
        type: "run_command",
        args: ["remove", "zod"],
      }),
    ]);
    expect(
      result.result.operations.some(
        (operation) => operation.type === "run_command" && operation.args.includes("add"),
      ),
    ).toBe(false);
  });

  it("reports a no-op when the package is already absent", async () => {
    const root = await nextFixture({
      "package.json": JSON.stringify({
        name: "demo-app",
        dependencies: { next: "16.0.0" },
      }),
    });
    const result = await planRemove({ startDir: root, integrationId: "zod", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.valid).toBe(true);
    expect(result.result.operations).toEqual([]);
  });

  it("does not delete leftover Prettier config files", async () => {
    const root = await nextFixture({
      ".prettierrc": "{}\n",
    });
    const result = await planRemove({ startDir: root, integrationId: "prettier", registry });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.operations.map((operation) => operation.type)).toEqual([
      "run_command",
      "show_message",
    ]);
    expect(
      result.result.operations.some(
        (operation) => operation.type === "create_file" || operation.type === "modify_text",
      ),
    ).toBe(false);
  });

  it("refuses remove when another detected integration requires the target", async () => {
    const root = await nextFixture({
      "package.json": JSON.stringify({
        name: "demo-app",
        dependencies: { next: "16.0.0", zod: "4.0.0", helper: "1.0.0" },
      }),
    });
    const result = await planRemove({ startDir: root, integrationId: "zod", registry });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("UNSUPPORTED_CONTEXT");
    expect(result.error.message).toContain("helper");
  });
});
