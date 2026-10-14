import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import {
  NODE_DEPENDENCY_PROBE,
  dependencyProbeResultSchema,
  dependencyVerificationOperation,
} from "./dependency-probe.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "reposetup-installed-check-"));
  roots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({
      dependencies: { "@example/runtime": "1.0.0" },
      devDependencies: { tooling: "1.0.0" },
      optionalDependencies: { optional: "1.0.0" },
      peerDependencies: { peer: "1.0.0" },
    }),
  );
  for (const name of ["@example/runtime", "tooling"]) {
    const directory = path.join(root, "node_modules", name);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ name, version: "1.0.0", exports: { ".": "./index.js" } }),
    );
    // A health check must not execute third-party module code or rely on exported package.json.
    await writeFile(path.join(directory, "index.js"), "throw new Error('Do not import me');");
  }
  return root;
}

async function probe(root: string) {
  try {
    const result = await promisify(execFile)(process.execPath, ["-e", NODE_DEPENDENCY_PROBE], {
      cwd: root,
    });
    return {
      code: 0,
      data: {
        ...dependencyProbeResultSchema.parse(JSON.parse(result.stdout)),
        environment: await realpath(JSON.parse(result.stdout).environment as string),
      },
    };
  } catch (error) {
    const result = error as { code: number; stdout: string };
    return {
      code: result.code,
      data: {
        ...dependencyProbeResultSchema.parse(JSON.parse(result.stdout)),
        environment: await realpath(JSON.parse(result.stdout).environment as string),
      },
    };
  }
}

describe("installed dependency verification", () => {
  it("checks runtime and dev metadata even when package exports hide package.json", async () => {
    const root = await fixture();
    expect(await probe(root)).toEqual({
      code: 0,
      data: {
        missing: [],
        errors: [],
        checked: ["@example/runtime", "tooling"],
        environment: await realpath(root),
      },
    });
  });
  it("fails when a declared package is missing or has corrupt metadata", async () => {
    const root = await fixture();
    await rm(path.join(root, "node_modules/@example/runtime"), { recursive: true });
    await writeFile(path.join(root, "node_modules/tooling/package.json"), "invalid json");
    expect(await probe(root)).toEqual({
      code: 1,
      data: {
        missing: ["@example/runtime", "tooling"],
        errors: [],
        checked: [],
        environment: await realpath(root),
      },
    });
  });
  it.each(["uv", "pip"] as const)(
    "does not synchronize or download packages for %s verification",
    (manager) => {
      const operation = dependencyVerificationOperation("python", manager, "apps/api");
      expect(operation.type).toBe("verify");
      expect(operation.cwd).toBe("apps/api");
      expect(operation.args).toContain("-I");
      expect(operation.args).toContain("-B");
      if (manager === "uv") {
        expect(operation.args).toEqual(
          expect.arrayContaining(["--no-sync", "--offline", "--no-python-downloads"]),
        );
      }
    },
  );
});
