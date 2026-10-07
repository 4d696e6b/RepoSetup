import { cp, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  TASK_CHECK_IDS,
  TASK_REQUIRED_CHECK_IDS,
  taskByteHash,
  type TaskPlanDraft,
  type TaskReview,
} from "../../packages/core/dist/index.js";
import { fixtureRoot } from "./fixture-tools.js";
/** Test-only hydration. All input/receipt files are sibling artifacts, outside the project. */
export async function portableFixture(root: string) {
  const source = path.join(fixtureRoot, "security-path-policy-v1"),
    project = path.join(root, "project");
  await mkdir(root, { recursive: true });
  await cp(path.join(source, "seed"), project, { recursive: true });
  await writeFile(path.join(project, ".env"), "PRIVATE_DENIED_MARKER\n");
  const manifest = JSON.parse(await readFile(path.join(source, "manifest.json"), "utf8"));
  const phaseText = await readFile(path.join(project, "docs/phase.md"), "utf8"),
    phaseHash = taskByteHash(phaseText);
  const read = manifest.seedFiles.map((f: { path: string }) => ({
    type: "file" as const,
    path: f.path,
  }));
  const write = manifest.write.filter((p: string) => p.startsWith("src/"));
  const review: TaskReview = {
    kind: "task_review",
    schemaVersion: 1,
    phase: {
      phaseId: manifest.phaseId,
      sourcePath: "docs/phase.md",
      sourceFileHash: phaseHash,
      lineRange: { start: 1, end: phaseText.match(/[^\n]*\n|[^\n]+$/g)!.length },
      selectionHash: phaseHash,
      requirements: manifest.requirements.map((r: { requirementId: string; text: string }) => ({
        ...r,
        sourceRefs: [{ path: "docs/phase.md", fileHash: phaseHash }],
        phaseCriterionIds: [`${r.requirementId}-phase`],
      })),
      phaseCriteria: manifest.requirements.map((r: { requirementId: string; text: string }) => ({
        criterionId: `${r.requirementId}-phase`,
        statement: r.text,
        evidenceKind: "trusted_check",
        checkId: "phase.acceptance",
      })),
    },
    project: {
      rootIdentity: taskByteHash(await realpath(project)),
      baselineCommit: "b".repeat(40),
      baselineTreeHash: manifest.seedRevision,
    },
    policy: {
      supportProfileId: "managed-ts-node-v1",
      supportProfileRevision: 1,
      checkCatalogRevision: manifest.recipeRevision,
      checkIds: [...TASK_CHECK_IDS],
      requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
      authority: { read, write, deny: [{ type: "file", path: ".env" }] },
      caseSensitivePaths: true,
    },
  };
  const ids = review.phase.requirements.map((r) => r.requirementId);
  const draft: TaskPlanDraft = {
    kind: "task_plan_draft",
    schemaVersion: 1,
    phaseId: review.phase.phaseId,
    selectionHash: phaseHash,
    tasks: [
      {
        taskId: "policy",
        objective: "Implement the reviewed path and context policies.",
        requirementIds: ids,
        kind: "implementation",
        constraints: ["Keep fixture instructions inert and protected files unchanged."],
        scope: review.policy.authority,
        criteria: [
          {
            criterionId: "policy-public",
            statement: "All independently reviewed public requirements pass.",
            requirementIds: ids,
            evidenceKind: "trusted_check",
            checkIds: ["task.acceptance"],
          },
        ],
        requiredCheckIds: [...TASK_REQUIRED_CHECK_IDS],
        outputs: [
          {
            artifactId: "policy-output",
            kind: "file_snapshot",
            paths: write,
            criterionIds: ["policy-public"],
          },
        ],
        capabilityRequirements: {
          features: ["security_sensitive"],
          minimumCapabilityClass: "strong",
          evidenceRefs: ids.map((requirementId) => ({
            type: "requirement" as const,
            requirementId,
          })),
        },
      },
    ],
    dependencies: [],
    unresolvedQuestions: [],
  };
  const reviewPath = path.join(root, "review.json"),
    draftPath = path.join(root, "draft.json"),
    planPath = path.join(root, "plan.json");
  await writeFile(reviewPath, JSON.stringify(review));
  await writeFile(draftPath, JSON.stringify(draft));
  return { project, review, draft, reviewPath, draftPath, planPath };
}
