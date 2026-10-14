import {
  compileTaskPlan,
  prepareTaskContext,
  checkTaskContextFreshness,
  selectPortableTask,
  createPortableHandoff,
  inspectPortableTasks,
  taskFailure,
  TASK_CONTEXT_LIMITS,
  TASK_DOCUMENT_LIMITS,
  type RepoSetupError,
} from "@reposetup/core";
import { loadTaskDocument, loadTaskReview, loadReviewedPlan, checkReviewedPhase } from "./input.js";
import { CLI_OUTPUT_VERSION, renderErrorJson } from "../machine-output.js";
import { exitCodeForError } from "../exit-codes.js";
import { writeLine } from "../io.js";
import { formatError } from "../format-error.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "../types.js";
import { handleManagedCompilation } from "./managed-compile.js";

export type TaskCommandOptions = {
  review: string;
  root?: string;
  preferences?: string;
  draft?: string;
  plan?: string;
  heading?: string;
  lines?: string;
  task?: string;
  runId?: string;
  attempt?: string;
  state?: string;
  managed?: boolean;
  stateRoot?: string;
  effort?: string;
  maxOutputTokens?: string;
  timeoutMs?: string;
  allowProviderUsage?: boolean;
  approveCompilation?: string;
  dryRun: boolean;
};
const notChecked = {
  baselineGit: "not_checked",
  toolAvailability: "not_checked",
  verification: "not_checked",
  effectiveConfiguration: { provenance: "unknown" },
  managedUsage: { provenance: "unknown" },
};
function fail(error: RepoSetupError, deps: ResolvedCliDeps, globals: GlobalCliOptions): number {
  writeLine(
    globals.json ? deps.io.writeOut : deps.io.writeErr,
    globals.json ? renderErrorJson(error) : formatError(error),
  );
  return exitCodeForError(error);
}
function emit(
  value: object,
  lines: string[],
  deps: ResolvedCliDeps,
  globals: GlobalCliOptions,
): void {
  writeLine(deps.io.writeOut, globals.json ? JSON.stringify(value) : lines.join("\n"));
}
export async function handleTask(
  mode: "compile" | "next" | "status",
  options: TaskCommandOptions,
  deps: ResolvedCliDeps,
  globals: GlobalCliOptions,
): Promise<number> {
  try {
    if (mode === "compile" && options.managed)
      return await handleManagedCompilation(options, deps, globals);
    if (
      mode === "compile" &&
      (options.stateRoot ||
        options.effort ||
        options.maxOutputTokens ||
        options.timeoutMs ||
        options.allowProviderUsage ||
        options.approveCompilation)
    )
      return fail(
        taskFailure(
          "TASK_SELECTION_INVALID",
          "Provider options require --managed; portable compilation stays local.",
        ).error,
        deps,
        globals,
      );
    return await handle(mode, options, deps, globals);
  } catch {
    return fail(
      taskFailure("TASK_PLAN_INVALID", "Task input could not be safely processed.").error,
      deps,
      globals,
    );
  }
}
async function handle(
  mode: "compile" | "next" | "status",
  options: TaskCommandOptions,
  deps: ResolvedCliDeps,
  globals: GlobalCliOptions,
): Promise<number> {
  const loaded = await loadTaskReview({
    review: options.review,
    ...(options.root === undefined ? {} : { root: options.root }),
    ...(options.preferences === undefined ? {} : { preferences: options.preferences }),
    deps,
  });
  if (!loaded.success) return fail(loaded.error, deps, globals);
  const { review, repository, preferences } = loaded.data;
  const phase = await checkReviewedPhase(review, repository, {
    ...(options.heading === undefined ? {} : { heading: options.heading }),
    ...(options.lines === undefined ? {} : { lines: options.lines }),
  });
  if (!phase.success) return fail(phase.error, deps, globals);
  if (mode === "compile") {
    if (options.draft === undefined) {
      const error = taskFailure(
        "TASK_DECOMPOSITION_REQUIRED",
        "Supply --draft with a structured task_plan_draft; Markdown selection does not decompose work.",
      ).error;
      emit(
        {
          version: CLI_OUTPUT_VERSION,
          kind: "task_decomposition_request",
          dryRun: options.dryRun,
          error,
          phase: review.phase,
          authority: review.policy,
          requiredReply: {
            kind: "task_plan_draft",
            schemaVersion: 1,
            phaseId: review.phase.phaseId,
            selectionHash: review.phase.selectionHash,
            fields: ["tasks", "dependencies", "unresolvedQuestions"],
          },
          ...notChecked,
        },
        [
          "Task decomposition required.",
          error.message,
          "Use the task_plan_draft contract with the independently reviewed requirements, scopes and checks.",
          "No provider was called and no state was created.",
        ],
        deps,
        globals,
      );
      return exitCodeForError(error);
    }
    const draft = await loadTaskDocument(options.draft, deps);
    if (!draft.success) return fail(draft.error, deps, globals);
    if (draft.data.kind !== "task_plan_draft")
      return fail(
        taskFailure("TASK_DRAFT_INVALID", "Expected task_plan_draft input.").error,
        deps,
        globals,
      );
    const compiled = compileTaskPlan({
      phase: review.phase,
      project: review.project,
      policy: review.policy,
      draft: draft.data,
    });
    if (!compiled.success) return fail(compiled.error, deps, globals);
    if (
      Buffer.byteLength(
        JSON.stringify({
          version: CLI_OUTPUT_VERSION,
          kind: "task_compilation",
          dryRun: options.dryRun,
          baselineGit: "not_checked",
          plan: compiled.data,
        }),
      ) +
        1 >
      TASK_DOCUMENT_LIMITS.bytes
    )
      return fail(
        taskFailure("TASK_PLAN_INVALID", "Compilation receipt exceeds its artifact byte limit.")
          .error,
        deps,
        globals,
      );
    emit(
      {
        version: CLI_OUTPUT_VERSION,
        kind: "task_compilation",
        dryRun: options.dryRun,
        baselineGit: "not_checked",
        plan: compiled.data,
      },
      [
        `Task plan ${compiled.data.planId}`,
        `Phase: ${review.phase.phaseId}; tasks: ${compiled.data.tasks.length}; requirements: ${compiled.data.requirements.length}`,
        `Order: ${compiled.data.orderedTaskIds.join(", ")}`,
        "Baseline Git and trusted checks: not checked. No files or state were written.",
        "Use --json to obtain a receipt accepted by task next/status.",
      ],
      deps,
      globals,
    );
    return 0;
  }
  if (options.plan === undefined)
    return fail(
      taskFailure(
        "TASK_PLAN_INVALID",
        "Provide --plan with a frozen task plan or compilation receipt.",
      ).error,
      deps,
      globals,
    );
  const plan = await loadReviewedPlan(options.plan, review, deps);
  if (!plan.success) return fail(plan.error, deps, globals);
  if (mode === "status") {
    let reportedSnapshot: object | null = null;
    if (options.state !== undefined) {
      const state = await loadTaskDocument(options.state, deps);
      if (!state.success) return fail(state.error, deps, globals);
      if (state.data.kind !== "phase_run" || state.data.planId !== plan.data.planId)
        return fail(
          taskFailure("TASK_RUN_STATE_INVALID", "Expected a phase_run snapshot for this plan.")
            .error,
          deps,
          globals,
        );
      reportedSnapshot = {
        authority: "caller_supplied_unverified",
        runId: state.data.runId,
        stateRevision: state.data.stateRevision,
        reportedStatus: state.data.status,
        tasks: state.data.tasks,
        attempts: state.data.attempts.map((attempt) => ({
          attemptId: attempt.attemptId,
          reportedStatus: attempt.status,
          effectiveConfiguration: attempt.effectiveConfiguration,
          usage: attempt.usage,
        })),
        acceptedArtifactCount: state.data.acceptedArtifacts.length,
      };
    }
    const tasks = inspectPortableTasks(plan.data);
    emit(
      {
        version: CLI_OUTPUT_VERSION,
        kind: "task_status",
        dryRun: options.dryRun,
        planId: plan.data.planId,
        stateAuthority: reportedSnapshot === null ? "not_recorded" : "caller_supplied_unverified",
        tasks,
        reportedSnapshot,
        ...notChecked,
      },
      [
        `Task plan ${plan.data.planId}`,
        ...tasks.map(
          (task) =>
            `${task.taskId}: ${task.eligibility}; attempts not recorded; verification not checked`,
        ),
        reportedSnapshot === null
          ? "No run state was read or created."
          : "Caller snapshot is unverified; reported completion does not establish acceptance.",
      ],
      deps,
      globals,
    );
    return 0;
  }
  if (preferences.executionMode !== "handoff")
    return fail(
      taskFailure(
        "TASK_PROVIDER_UNAVAILABLE",
        "task next is advisory; choose handoff preferences or use reviewed task run.",
      ).error,
      deps,
      globals,
    );
  const taskId = selectPortableTask(plan.data, options.task);
  if (!taskId.success) return fail(taskId.error, deps, globals);
  const context = await prepareTaskContext({
    plan: plan.data,
    policy: review.policy,
    taskId: taskId.data,
    repository,
  });
  if (!context.success) return fail(context.error, deps, globals);
  const task = plan.data.tasks.find((item) => item.taskId === taskId.data)!;
  if (options.dryRun) {
    emit(
      {
        version: CLI_OUTPUT_VERSION,
        kind: "task_handoff_preview",
        dryRun: true,
        planId: plan.data.planId,
        taskId: taskId.data,
        context: context.data.context,
        scope: task.scope,
        checkIds: task.requiredCheckIds,
        capabilityRequirements: task.capabilityRequirements,
        effortPreference: preferences.effortPreference,
        runId: null,
        attemptId: null,
        enforcement: "advisory",
        ...notChecked,
      },
      [
        `Portable preview for ${taskId.data}`,
        `Context: ${context.data.context.size.bytes} bytes; sources: ${context.data.context.sources.length}`,
        "Routing/scope/budgets: advisory; verification and runtime prerequisites: not checked.",
        "No source bodies printed, run/attempt opened, subprocess, provider call or write performed.",
      ],
      deps,
      globals,
    );
    return 0;
  }
  if (
    options.runId === undefined ||
    options.attempt === undefined ||
    !/^[1-3]$/.test(options.attempt)
  )
    return fail(
      taskFailure(
        "TASK_SELECTION_INVALID",
        "Provide --run-id <UUID> and --attempt <1-3> as advisory caller dispatch identities.",
      ).error,
      deps,
      globals,
    );
  const fresh = await checkTaskContextFreshness(context.data, repository);
  if (!fresh.success) return fail(fresh.error, deps, globals);
  const packet = createPortableHandoff({
    plan: plan.data,
    taskId: taskId.data,
    materialized: context.data,
    runId: options.runId,
    attemptNumber: Number(options.attempt),
    preferences,
  });
  if (!packet.success) return fail(packet.error, deps, globals);
  const output = {
    version: CLI_OUTPUT_VERSION,
    kind: "task_handoff",
    dryRun: false,
    attemptAuthority: "caller_supplied_advisory",
    protocol: {
      replyKind: "task_handoff_result",
      schemaVersion: 1,
      application: "proposal_only",
      completionAuthority: "none",
      managedCallAuthority: "none",
    },
    ...packet.data,
  };
  const rendered = JSON.stringify(output, null, globals.json ? undefined : 2);
  if (Buffer.byteLength(rendered) + 1 > TASK_CONTEXT_LIMITS.maxContextBytes)
    return fail(
      taskFailure("TASK_CONTEXT_LIMIT_EXCEEDED", "Complete output exceeds the handoff byte limit.")
        .error,
      deps,
      globals,
    );
  // Normal handoff is always a protocol packet, including non-TTY and plain-output mode.
  writeLine(deps.io.writeOut, rendered);
  return 0;
}
