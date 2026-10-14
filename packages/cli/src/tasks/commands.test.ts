import { afterEach, describe as describeOnAllPlatforms, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  taskByteHash,
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  DEFAULT_HANDOFF_PREFERENCES,
  parseTaskDocument,
} from "@reposetup/core";
import { runCli } from "../run-cli.js";
import { createDefaultFs } from "../io.js";
import type { CliDeps } from "../types.js";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const base = await mkdtemp(path.join(tmpdir(), "reposetup-task-cli-"));
  roots.push(base);
  const root = path.join(base, "project");
  await mkdir(root);
  await mkdir(path.join(root, "docs"));
  await mkdir(path.join(root, "src"));
  const phaseText = "# Phase one\nPreserve the public contract.\n";
  await writeFile(path.join(root, "docs/phase.md"), phaseText);
  await writeFile(path.join(root, "src/main.ts"), "export const marker = 'SOURCE_BODY_MARKER';\n");
  const hash = taskByteHash(phaseText);
  const catalogHash = taskByteHash("reviewed-checks");
  const read = [
    { type: "subtree", path: "src" },
    { type: "subtree", path: "docs" },
  ];
  const phase = {
    phaseId: "phase-one",
    sourcePath: "docs/phase.md",
    sourceFileHash: hash,
    lineRange: { start: 1, end: 2 },
    selectionHash: hash,
    requirements: [
      {
        requirementId: "req-one",
        text: "Preserve the public contract.",
        sourceRefs: [{ path: "docs/phase.md", fileHash: hash }],
        phaseCriterionIds: ["phase-criterion"],
      },
    ],
    phaseCriteria: [
      {
        criterionId: "phase-criterion",
        statement: "Independent acceptance passes.",
        evidenceKind: "trusted_check",
        checkId: "phase.acceptance",
      },
    ],
  };
  const review = {
    kind: "task_review",
    schemaVersion: 1,
    phase,
    project: {
      rootIdentity: taskByteHash(await realpath(root)),
      baselineCommit: "b".repeat(40),
      baselineTreeHash: catalogHash,
    },
    policy: {
      supportProfileId: "managed-ts-node-v1",
      supportProfileRevision: 1,
      checkCatalogRevision: catalogHash,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority: { read, write: ["src/main.ts"], deny: [] },
      caseSensitivePaths: true,
    },
  };
  const task = {
    taskId: "edit",
    objective: "Preserve exported types.",
    requirementIds: ["req-one"],
    kind: "implementation",
    constraints: [],
    scope: { read, write: ["src/main.ts"], deny: [] },
    criteria: [
      {
        criterionId: "task-criterion",
        statement: "Public types remain compatible.",
        requirementIds: ["req-one"],
        evidenceKind: "trusted_check",
        checkIds: ["task.acceptance"],
      },
    ],
    requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
    outputs: [
      {
        artifactId: "source-output",
        kind: "file_snapshot",
        paths: ["src/main.ts"],
        criterionIds: ["task-criterion"],
      },
    ],
    capabilityRequirements: {
      features: ["local_logic"],
      minimumCapabilityClass: "baseline",
      evidenceRefs: [{ type: "requirement", requirementId: "req-one" }],
    },
  };
  const draft = {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: "phase-one",
    selectionHash: hash,
    tasks: [task],
    dependencies: [],
    unresolvedQuestions: [],
  };
  const reviewPath = path.join(base, "review.json");
  const draftPath = path.join(base, "draft.json");
  const planPath = path.join(base, "plan.json");
  await writeFile(reviewPath, JSON.stringify(review));
  await writeFile(draftPath, JSON.stringify(draft));
  let stdout = "";
  let stderr = "";
  const effect = vi.fn(async () => {
    throw new Error("Unexpected effect");
  });
  const deps: CliDeps = {
    cwd: root,
    fs: createDefaultFs(),
    io: {
      writeOut: (text) => {
        stdout += text;
      },
      writeErr: (text) => {
        stderr += text;
      },
    },
    runProcess: effect,
    commandExists: effect,
    resolveExecutable: effect,
    executionLock: { acquire: effect },
    promptCreate: effect,
    confirmCreate: effect,
    executorFs: new Proxy({}, { get: () => effect }) as NonNullable<CliDeps["executorFs"]>,
    executionJournal: { start: effect, record: effect, finish: effect },
  };
  const call = async (args: string[], extra: CliDeps = {}) => {
    stdout = "";
    stderr = "";
    const result = await runCli(args, { ...deps, ...extra });
    return { ...result, stdout, stderr };
  };
  const common = ["--review", reviewPath];
  const compile = async () => {
    const result = await call(["task", "compile", ...common, "--draft", draftPath, "--json"]);
    expect(result.exitCode, result.stdout || result.stderr).toBe(0);
    await writeFile(planPath, result.stdout);
    return JSON.parse(result.stdout);
  };
  return {
    base,
    root,
    review,
    draft,
    reviewPath,
    draftPath,
    planPath,
    common,
    deps,
    effect,
    call,
    compile,
  };
}
const RUN = "123e4567-e89b-42d3-a456-426614174000";
// Real task filesystem fixtures target the initial Linux/macOS profile.
// Windows task execution remains unsupported; pure core/provider tests still run.
const describe = describeOnAllPlatforms.skipIf(process.platform === "win32");

describe("portable task CLI", () => {
  it("compiles a phase by heading and accepts its receipt as next/status input without effects", async () => {
    const f = await fixture();
    const before = await readFile(path.join(f.root, "src/main.ts"));
    const compiled = await f.call([
      "task",
      "compile",
      ...f.common,
      "--draft",
      f.draftPath,
      "--heading",
      "Phase one",
      "--json",
    ]);
    expect(compiled.exitCode).toBe(0);
    const receipt = JSON.parse(compiled.stdout);
    expect(receipt.kind).toBe("task_compilation");
    expect(receipt.baselineGit).toBe("not_checked");
    await writeFile(f.planPath, compiled.stdout);
    const next = await f.call([
      "--json",
      "task",
      "next",
      ...f.common,
      "--plan",
      f.planPath,
      "--run-id",
      RUN,
      "--attempt",
      "1",
    ]);
    expect(next.exitCode, next.stdout || next.stderr).toBe(0);
    const output = JSON.parse(next.stdout);
    expect(output.handoff.attemptId).toBe(`${RUN}/edit/1`);
    expect(output.handoff.recommendedRouting).toBeNull();
    expect(parseTaskDocument(output.handoff).success).toBe(true);
    expect(
      output.context.files.some((file: { text: string }) =>
        file.text.includes("SOURCE_BODY_MARKER"),
      ),
    ).toBe(true);
    expect(f.effect).not.toHaveBeenCalled();
    expect(await readFile(path.join(f.root, "src/main.ts"))).toEqual(before);
    expect(await readdir(f.root)).toEqual(["docs", "src"]);
  });
  it("returns an actionable decomposition request without fabricating tasks or calling providers", async () => {
    const f = await fixture();
    const result = await f.call(["task", "compile", ...f.common, "--json", "--dry-run"]);
    expect(result.exitCode).toBe(3);
    const output = JSON.parse(result.stdout);
    expect(output.kind).toBe("task_decomposition_request");
    expect(output.error.code).toBe("TASK_DECOMPOSITION_REQUIRED");
    expect(output.requiredReply.kind).toBe("task_plan_draft");
    expect(f.effect).not.toHaveBeenCalled();
  });
  it("dry-runs compilation, next and status with no source bodies, identities, prompts, processes, locks or writes", async () => {
    const f = await fixture();
    await f.compile();
    for (const mode of ["next", "status"]) {
      const result = await f.call([
        "task",
        mode,
        ...f.common,
        "--plan",
        f.planPath,
        "--json",
        "--dry-run",
      ]);
      expect(result.exitCode, result.stdout || result.stderr).toBe(0);
      expect(result.stdout).not.toContain("SOURCE_BODY_MARKER");
      const output = JSON.parse(result.stdout);
      expect(output.dryRun).toBe(true);
      if (mode === "next") {
        expect(output.runId).toBeNull();
        expect(output.attemptId).toBeNull();
        expect(output.kind).toBe("task_handoff_preview");
      }
    }
    const result = await f.call([
      "task",
      "compile",
      ...f.common,
      "--draft",
      f.draftPath,
      "--lines",
      "1:2",
      "--dry-run",
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain("SOURCE_BODY_MARKER");
    expect(f.effect).not.toHaveBeenCalled();
  });
  it("preserves plain/non-TTY packet output and text status without interactive confirmation", async () => {
    const f = await fixture();
    await f.compile();
    const next = await f.call([
      "task",
      "next",
      ...f.common,
      "--plan",
      f.planPath,
      "--run-id",
      RUN,
      "--attempt",
      "2",
      "--quiet",
    ]);
    expect(next.exitCode).toBe(0);
    expect(JSON.parse(next.stdout).attemptAuthority).toBe("caller_supplied_advisory");
    const status = await f.call(["task", "status", ...f.common, "--plan", f.planPath]);
    expect(status.stdout).toContain("edit: candidate");
    expect(status.stdout).toContain("verification not checked");
    expect(f.effect).not.toHaveBeenCalled();
  });
  it("rejects changed selectors, mixed selectors, stale Markdown, malformed drafts and forged plans", async () => {
    const f = await fixture();
    for (const flags of [
      ["--lines", "1:1"],
      ["--lines", "1:2", "--heading", "Phase one"],
      ["--heading", "Absent"],
    ])
      expect(
        (await f.call(["task", "compile", ...f.common, "--draft", f.draftPath, ...flags, "--json"]))
          .exitCode,
      ).toBe(2);
    await f.compile();
    const plan = JSON.parse(await readFile(f.planPath, "utf8"));
    plan.plan.orderedTaskIds = ["forged"];
    await writeFile(f.planPath, JSON.stringify(plan));
    expect(
      (await f.call(["task", "status", ...f.common, "--plan", f.planPath, "--json"])).exitCode,
    ).toBe(2);
    await writeFile(f.draftPath, JSON.stringify({ ...f.draft, command: "synthetic-command" }));
    expect(
      (await f.call(["task", "compile", ...f.common, "--draft", f.draftPath, "--json"])).exitCode,
    ).toBe(2);
    await writeFile(path.join(f.root, "docs/phase.md"), "changed\n");
    expect(
      (await f.call(["task", "compile", ...f.common, "--draft", f.draftPath, "--json"])).exitCode,
    ).toBe(2);
    expect(f.effect).not.toHaveBeenCalled();
  });
  it("rejects managed mode, missing/invalid dispatch identity and preference scope expansion", async () => {
    const f = await fixture();
    await f.compile();
    for (const flags of [
      [],
      ["--run-id", "bad", "--attempt", "1"],
      ["--run-id", RUN, "--attempt", "4"],
    ])
      expect(
        (await f.call(["task", "next", ...f.common, "--plan", f.planPath, "--json", ...flags]))
          .exitCode,
      ).toBe(2);
    const preferencesPath = path.join(f.base, "preferences.json");
    await writeFile(
      preferencesPath,
      JSON.stringify({ ...DEFAULT_HANDOFF_PREFERENCES, executionMode: "managed" }),
    );
    expect(
      (
        await f.call([
          "task",
          "next",
          ...f.common,
          "--plan",
          f.planPath,
          "--preferences",
          preferencesPath,
          "--dry-run",
          "--json",
        ])
      ).exitCode,
    ).toBe(4);
    await writeFile(
      preferencesPath,
      JSON.stringify({
        ...DEFAULT_HANDOFF_PREFERENCES,
        exclusions: [{ type: "file", path: "src/main.ts" }],
      }),
    );
    expect(
      (
        await f.call([
          "task",
          "next",
          ...f.common,
          "--plan",
          f.planPath,
          "--preferences",
          preferencesPath,
          "--dry-run",
          "--json",
        ])
      ).exitCode,
    ).toBe(3);
    expect(f.effect).not.toHaveBeenCalled();
  });
  it("fails closed for unbounded input adapters and private metadata without echoing secrets", async () => {
    const f = await fixture();
    expect(
      (
        await f.call(["task", "compile", ...f.common, "--json"], {
          fs: { readFile: vi.fn(async () => "unused") },
        })
      ).exitCode,
    ).toBe(4);
    f.draft.tasks[0]!.objective = 'api_key="PRIVATE_VALUE_MARKER"';
    await writeFile(f.draftPath, JSON.stringify(f.draft));
    const result = await f.call(["task", "compile", ...f.common, "--draft", f.draftPath, "--json"]);
    expect(result.exitCode).toBe(3);
    expect(result.stdout + result.stderr).not.toContain("PRIVATE_VALUE_MARKER");
  });
  it("offers only implemented task commands and keeps both binary aliases on the same entry point", async () => {
    const f = await fixture();
    const help = await f.call(["task", "--help"]);
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("compile");
    expect(help.stdout).toContain("next");
    expect(help.stdout).toContain("status");
    expect(help.stdout).toMatch(/\n\s+run\s/);
    expect(help.stdout).not.toMatch(/\n\s+verify\s/);
    expect((await f.call(["task", "run"])).exitCode).toBe(2);
    expect((await f.call(["task"])).exitCode).toBe(2);
    const pkg = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
    expect(pkg.bin.rsetup).toBe(pkg.bin.reposetup);
  });
});

it.skipIf(process.platform === "win32")(
  "reports caller snapshots as unverified and cannot unlock dependent work",
  async () => {
    const f = await fixture();
    const first = f.draft.tasks[0]!;
    f.review.policy.authority.write.push("src/other.ts");
    const second = {
      ...first,
      taskId: "consumer",
      scope: { ...first.scope, write: ["src/other.ts"] },
      criteria: [{ ...first.criteria[0]!, criterionId: "consumer-criterion" }],
      outputs: [
        {
          artifactId: "consumer-output",
          kind: "file_snapshot",
          paths: ["src/other.ts"],
          criterionIds: ["consumer-criterion"],
        },
      ],
    };
    const draft = {
      ...f.draft,
      tasks: [first, second],
      dependencies: [
        {
          predecessorTaskId: "edit",
          consumerTaskId: "consumer",
          requiredArtifactIds: ["source-output"],
        },
      ],
    };
    await writeFile(f.reviewPath, JSON.stringify(f.review));
    await writeFile(f.draftPath, JSON.stringify(draft));
    const compiled = await f.compile();
    const hash = taskByteHash("reported-verification");
    const unknown = { provenance: "unknown" };
    const usage = {
      inputTokens: unknown,
      outputTokens: unknown,
      reasoningTokens: unknown,
      cachedInputTokens: unknown,
      totalTokens: unknown,
      costMicrousd: unknown,
      providerCallId: null,
      durationMs: 0,
      priceCatalogRevision: null,
      reserved: { calls: 0, inputTokens: 0, outputTokens: 0, costMicrousd: 0 },
    };
    const state = {
      kind: "phase_run",
      schemaVersion: 1,
      runId: RUN,
      stateRevision: 1,
      planId: compiled.plan.planId,
      project: { ...f.review.project, latestProjectRevision: hash, lastReconciledRevision: hash },
      executionMode: "handoff",
      supportQualification: { status: "unconfirmed", reasons: [], profileRevision: 1 },
      status: "succeeded",
      tasks: [
        {
          taskId: "edit",
          status: "accepted",
          attemptIds: [],
          reasonCode: null,
          acceptedVerificationId: hash,
        },
        {
          taskId: "consumer",
          status: "queued",
          attemptIds: [],
          reasonCode: null,
          acceptedVerificationId: null,
        },
      ],
      attempts: [],
      resourceLimits: DEFAULT_HANDOFF_PREFERENCES.resourceLimits,
      resourceLedger: { reservations: [], consumed: usage },
      acceptedArtifacts: [],
      activeAttemptId: null,
      finalVerification: null,
      events: [],
    };
    const statePath = path.join(f.base, "state.json");
    await writeFile(statePath, JSON.stringify(state));
    const status = await f.call([
      "task",
      "status",
      ...f.common,
      "--plan",
      f.planPath,
      "--state",
      statePath,
      "--json",
    ]);
    expect(status.exitCode).toBe(0);
    const output = JSON.parse(status.stdout);
    expect(output.stateAuthority).toBe("caller_supplied_unverified");
    expect(output.reportedSnapshot.reportedStatus).toBe("succeeded");
    expect(output.verification).toBe("not_checked");
    const next = await f.call([
      "task",
      "next",
      ...f.common,
      "--plan",
      f.planPath,
      "--task",
      "consumer",
      "--dry-run",
      "--json",
    ]);
    expect(next.exitCode).toBe(4);
    expect(JSON.parse(next.stdout).error.code).toBe("TASK_CHECK_BLOCKED");
    expect(f.effect).not.toHaveBeenCalled();
  },
);
