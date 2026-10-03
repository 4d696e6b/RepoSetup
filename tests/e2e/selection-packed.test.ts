import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { InstallationOperation } from "../../packages/core/src/operations/types.js";
import {
  cleanupWorkspace,
  createTempWorkspace,
  keepOnFailure,
  repoRoot,
  runNodeCli,
  runProcess,
  snapshotTree,
} from "./harness.js";
import {
  planFingerprint,
  prepareSelectionArtifact,
  sha256,
  verifyArtifactIdentity,
} from "./selection-artifact.js";
import {
  journeys,
  matrix,
  matrixPath,
  PRIVATE_MARKER,
  selectionFor,
  tokenFor,
  writeExistingContext,
} from "./selection-matrix.js";

const roots: string[] = [];
const passed = new Set<string>();
const observedPlans: Record<string, string> = {};
const expectedCases = [
  ...journeys.map(({ id }) => id),
  "artifact-identity",
  "alias/rsetup",
  "alias/reposetup",
  ...matrix.contexts.map(({ id }) => `satisfied/${id}`),
  ...matrix.contexts.map(({ id }) => `incompatible/${id}`),
  "invalid-inputs",
  "confirmation-conflicts",
];
let artifactRoot: string;
let artifact: Awaited<ReturnType<typeof prepareSelectionArtifact>>;
let emptyPath: string;

beforeAll(async () => {
  artifactRoot = await createTempWorkspace("reposetup-selection-pack-");
  artifact = await prepareSelectionArtifact(artifactRoot);
  emptyPath = path.join(artifactRoot, "no-project-tools");
  await mkdir(emptyPath);
});
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => cleanupWorkspace(root, keepOnFailure())));
});
afterAll(async () => {
  try {
    if (artifact !== undefined) {
      const report = {
        schemaVersion: 1,
        kind: "selection-packed-contract",
        qualification: false,
        scope:
          "Dry-run contract acceptance only; project installations and native shell qualification remain pending.",
        recordedAt: new Date().toISOString(),
        matrix: { revision: matrix.revision, sha256: sha256(await readFile(matrixPath)) },
        catalog: {
          revision: matrix.catalogRevision,
          recipeRevision: matrix.recipeRevision,
          cliContract: matrix.cliContract,
        },
        artifact: artifact.identity,
        sourceDirty: artifact.sourceDirty,
        externalArtifact: artifact.externalArtifact,
        workspaceLockSha256: sha256(await readFile(path.join(repoRoot, "pnpm-lock.yaml"))),
        installedCliLockSha256: artifact.installedLockSha256,
        runtime: {
          ...artifact.tools,
          platform: process.platform,
          architecture: process.arch,
          nodeTargetMet: Number(process.versions.node.split(".")[0]) === matrix.runtimes.nodeMajor,
        },
        expectedJourneys: journeys.map(({ id }) => id),
        expectedCases,
        observedPlanSha256: observedPlans,
        passedCases: [...passed].sort(),
        allJourneysPassed: journeys.every(({ id }) => passed.has(id)),
        allPackedCasesPassed: expectedCases.every((id) => passed.has(id)),
      };
      const output =
        process.env.REPOSETUP_SELECTION_REPORT ??
        path.join(artifactRoot, "selection-contract-report.json");
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
      if (process.env.REPOSETUP_SELECTION_REPORT !== undefined || keepOnFailure())
        process.stdout.write(`Selection contract report: ${output}\n`);
    }
  } finally {
    if (artifactRoot !== undefined) await cleanupWorkspace(artifactRoot, keepOnFailure());
  }
});

async function workspace() {
  const parent = await createTempWorkspace("RepoSetup selection 日本語 path-");
  roots.push(parent);
  // Python derives its legacy project name from the directory, so keep the leaf stable.
  const cwd = path.join(parent, "existing-app");
  await mkdir(cwd);
  return cwd;
}
async function run(args: string[], cwd: string) {
  // A dry-run must not need pnpm, uv, Python or another project subprocess on PATH.
  return runNodeCli(artifact.bin, args, {
    cwd,
    env: { ...process.env, PATH: emptyPath, Path: emptyPath },
  });
}
function planFrom(stdout: string): {
  operations: InstallationOperation[];
  orderedIntegrations: { id: string }[];
} {
  const output = JSON.parse(stdout);
  expect(output).toMatchObject({
    version: 1,
    kind: "plan",
    dryRun: true,
    plan: { valid: true, errors: [] },
  });
  return output.plan;
}

it("rejects changed artifact bytes, source, version and byte count before installation", () => {
  const bytes = Buffer.from("fixture tarball bytes");
  const sourceSha = "a".repeat(40);
  const record = {
    ...artifact.identity,
    sourceSha,
    artifact: "fixture.tgz",
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
  expect(verifyArtifactIdentity(record, bytes, "fixture.tgz", sourceSha)).toEqual(record);
  expect(
    verifyArtifactIdentity(
      { ...record, untrusted: PRIVATE_MARKER },
      bytes,
      "fixture.tgz",
      sourceSha,
    ),
  ).toEqual(record);
  for (const invalid of [
    { ...record, sourceSha: "b".repeat(40) },
    { ...record, bytes: bytes.length + 1 },
    { ...record, version: "0.2.0" },
    { ...record, sha256: "0".repeat(64) },
  ])
    expect(() => verifyArtifactIdentity(invalid, bytes, "fixture.tgz", sourceSha)).toThrow();
  expect(() =>
    verifyArtifactIdentity(record, Buffer.from("changed bytes"), "fixture.tgz", sourceSha),
  ).toThrow();
  passed.add("artifact-identity");
});

it.each(["rsetup", "reposetup"])(
  "launches installed %s at the identified version",
  async (alias) => {
    const result = await runProcess("npm", ["exec", "--", alias, "--version"], {
      cwd: artifact.installDir,
    });
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe(artifact.identity.version);
    passed.add(`alias/${alias}`);
  },
);

describe("packed selection matrix", () => {
  it.each(journeys)(
    "$id: token/file plans agree and preserve local files",
    async ({ id, context, ids, mode }) => {
      const cwd = await workspace();
      if (mode === "add") await writeExistingContext(cwd, context);
      else await writeFile(path.join(cwd, "README.md"), "Keep parent notes.\n");
      const selection = selectionFor(context, ids, mode);
      const input = path.join(cwd, "selection.json");
      await writeFile(input, JSON.stringify(selection));
      const before = await snapshotTree(cwd);
      const plans: unknown[] = [];
      for (const route of [
        ["--selection", tokenFor(selection)],
        [mode === "create" ? "--selection-file" : "--config", input],
      ]) {
        const result = await run(["--json", mode, ...route, "--dry-run"], cwd);
        expect(result.exitCode, result.stderr).toBe(0);
        const plan = planFrom(result.stdout);
        expect(result.stderr).toContain(
          `Decoded selection (${mode}, catalog ${matrix.catalogRevision})`,
        );
        expect(`${result.stdout}${result.stderr}`).not.toContain(PRIVATE_MARKER);
        const selected = new Set(plan.orderedIntegrations.map(({ id }) => id));
        for (const integration of ids) expect(selected.has(integration)).toBe(true);
        if (mode === "create") {
          expect(selected.has(context.context.frameworkId)).toBe(true);
          expect(plan.operations[0]).toMatchObject({
            type: "create_directory",
            path: "projects/qualified-app",
            behavior: "fail_if_exists",
          });
          for (const operation of plan.operations) {
            if ("path" in operation)
              expect(
                operation.path === "projects/qualified-app" ||
                  operation.path.startsWith("projects/qualified-app/"),
              ).toBe(true);
            if ("cwd" in operation)
              expect(
                operation.cwd === "projects/qualified-app" ||
                  operation.cwd?.startsWith("projects/qualified-app/"),
              ).toBe(true);
          }
        } else {
          expect(plan.operations).not.toEqual([]);
          const existing = new Set(Object.keys(before));
          for (const operation of plan.operations) {
            if (operation.type === "create_file") expect(existing.has(operation.path)).toBe(false);
            if ("cwd" in operation) expect(operation.cwd).toBe(".");
          }
        }
        plans.push(JSON.parse(result.stdout));
      }
      expect(plans[0]).toEqual(plans[1]);
      observedPlans[id] = planFingerprint((plans[0] as { plan: unknown }).plan);
      expect(
        observedPlans[id],
        `Plan drift for ${id}; review the change before revising the matrix`,
      ).toBe(matrix.planSha256[id]);
      expect(await snapshotTree(cwd)).toEqual(before);
      passed.add(id);
    },
  );
});

it.each(matrix.contexts)(
  "$id: satisfied add has an empty repeatable plan, preserving user pins",
  async (context) => {
    const cwd = await workspace();
    await writeExistingContext(cwd, context, true);
    const before = await snapshotTree(cwd);
    const token = tokenFor(selectionFor(context, context.optionalIds, "add"));
    for (let repeat = 0; repeat < 2; repeat++) {
      const result = await run(["--json", "add", "--selection", token, "--dry-run"], cwd);
      expect(result.exitCode, result.stderr).toBe(0);
      expect(planFrom(result.stdout).operations).toEqual([]);
      expect(await snapshotTree(cwd)).toEqual(before);
    }
    passed.add(`satisfied/${context.id}`);
  },
);

it.each(matrix.contexts)(
  "$id: incompatible actual context fails before mutation",
  async (context) => {
    const cwd = await workspace();
    const wrong = matrix.contexts.find(
      (item) => item.context.runtimeId !== context.context.runtimeId,
    )!;
    await writeExistingContext(cwd, wrong);
    const before = await snapshotTree(cwd);
    const result = await run(
      [
        "--json",
        "add",
        "--selection",
        tokenFor(selectionFor(context, context.optionalIds, "add")),
        "--dry-run",
      ],
      cwd,
    );
    expect(result.exitCode).toBe(3);
    expect(JSON.parse(result.stderr.trim().split("\n").at(-1)!)).toMatchObject({
      version: 1,
      kind: "error",
      error: { code: "UNSUPPORTED_CONTEXT" },
    });
    expect(await snapshotTree(cwd)).toEqual(before);
    passed.add(`incompatible/${context.id}`);
  },
);

it("rejects malformed, oversized, stale and hostile inputs without leaking values or writing files", async () => {
  const cwd = await workspace();
  const selection = selectionFor(matrix.contexts[1]!, ["zod"], "create");
  if (selection.mode !== "create") throw new Error("Expected create fixture");
  const invalid = [
    "%%%",
    "a".repeat(matrix.limits.tokenCharacters! + 1),
    Buffer.from("{broken json").toString("base64url"),
    Buffer.from([0xc0, 0xaf]).toString("base64url"),
    tokenFor({ ...selection, selectionVersion: 2 }),
    tokenFor({ ...selection, catalogRevision: "stale-catalog" }),
    tokenFor({ ...selection, catalogRevision: "0.3.0-cli.1" }),
    tokenFor({ ...selection, cliContract: "unknown-contract" }),
    tokenFor({ ...selection, commands: ["touch untrusted-output"] }),
    tokenFor({ ...selection, config: { ...selection.config, project: { name: "con" } } }),
    tokenFor({
      ...selection,
      config: { ...selection.config, project: { name: "app", path: "../escape" } },
    }),
    tokenFor({
      ...selection,
      config: { ...selection.config, project: { name: "$(touch injected)" } },
    }),
    tokenFor({
      ...selection,
      config: {
        ...selection.config,
        integrations: [{ id: "zod", options: { secret: PRIVATE_MARKER } }],
      },
    }),
    tokenFor({
      ...selection,
      config: { ...selection.config, integrations: [{ id: "zod" }, { id: "zod" }] },
    }),
  ];
  const before = await snapshotTree(cwd);
  for (const token of invalid) {
    const result = await run(["--json", "create", "--selection", token, "--dry-run"], cwd);
    expect(result.exitCode, result.stderr).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({
      version: 1,
      kind: "error",
      error: { code: "SELECTION_INVALID" },
    });
    expect(`${result.stdout}${result.stderr}`).not.toContain(PRIVATE_MARKER);
  }
  for (const bytes of [Buffer.alloc(matrix.limits.fileBytes! + 1, 32), Buffer.from([0xc0, 0xaf])]) {
    await writeFile(path.join(cwd, "invalid.json"), bytes);
    const snapshot = await snapshotTree(cwd);
    const result = await run(
      ["--json", "create", "--selection-file", "invalid.json", "--dry-run"],
      cwd,
    );
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stderr).error.code).toBe("SELECTION_INVALID");
    expect(await snapshotTree(cwd)).toEqual(snapshot);
  }
  // The only new file is the test-authored invalid input, never a project or escaped output.
  const after = await snapshotTree(cwd);
  delete after["invalid.json"];
  expect(after).toEqual(before);
  passed.add("invalid-inputs");
});

it("prints decoded choices and operations before refusing noninteractive execution or bypass flags", async () => {
  const cwd = await workspace();
  const selection = selectionFor(matrix.contexts[1]!, ["prettier"], "create");
  const token = tokenFor(selection);
  const before = await snapshotTree(cwd);
  const result = await run(["create", "--selection", token, "--quiet"], cwd);
  expect(result.exitCode).toBe(2);
  expect(result.stdout).toContain("Decoded selection");
  expect(result.stdout).toContain("Operations");
  expect(result.stderr).toContain("requires interactive confirmation");
  const conflicts = [
    ["--yes"],
    ["--config", "absent.json"],
    ["--preset", "beginner-express"],
    ["--framework", "express"],
    ["--package-manager", "pnpm"],
    ["--typescript"],
  ];
  for (const flags of conflicts) {
    const blocked = await run(
      ["--json", "create", "--selection", token, ...flags, "--dry-run"],
      cwd,
    );
    expect(blocked.exitCode).toBe(2);
    expect(JSON.parse(blocked.stderr).error.code).toBe("SELECTION_INVALID");
  }
  expect(await snapshotTree(cwd)).toEqual(before);
  passed.add("confirmation-conflicts");
});
