import path from "node:path";
import { realpath } from "node:fs/promises";
import {
  prepareTaskCompilationContext,
  taskContentHash,
  taskCompilationAllowanceId,
  executeTaskCompilation,
  taskFailure,
  TASK_DOCUMENT_LIMITS,
  type TaskParseResult,
  type TaskRunAdapter,
  type TaskProviderAdapter,
  type TaskCompilationPolicy,
} from "@reposetup/core";
import { loadTaskReview, checkReviewedPhase } from "./input.js";
import { createTaskRunAdapter } from "./application-adapter.js";
import { createOpenAITaskProvider, PROVIDER_PRICE_REVISION } from "./provider-adapter.js";
import { writeLine } from "../io.js";
import { renderErrorJson } from "../machine-output.js";
import { exitCodeForError } from "../exit-codes.js";
import { formatError } from "../format-error.js";
import type { TaskCommandOptions } from "./commands.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "../types.js";

export type TaskCompilationHostFactory = (input: {
  projectRoot: string;
  stateRoot: string;
  effort: string;
  policy: TaskCompilationPolicy;
}) => Promise<TaskParseResult<{ adapter: TaskRunAdapter; provider: TaskProviderAdapter }>>;
export const createDefaultTaskCompilationHost: TaskCompilationHostFactory = async (input) => {
  const adapter = await createTaskRunAdapter({
    projectRoot: input.projectRoot,
    stateRoot: input.stateRoot,
    authority: input.policy.authority,
  });
  if (!adapter.success) return adapter;
  const provider = createOpenAITaskProvider({ model: "gpt-6.1-sol", effort: input.effort });
  return provider.success
    ? { success: true, data: { adapter: adapter.data, provider: provider.data } }
    : provider;
};
/** CLI review and formatting only. The executor owns all private ledger writes and dispatch. */
export async function handleManagedCompilation(
  options: TaskCommandOptions,
  deps: ResolvedCliDeps,
  globals: GlobalCliOptions,
): Promise<number> {
  const started = performance.now();
  const fail = (error: Parameters<typeof exitCodeForError>[0]) => {
    writeLine(
      globals.json ? deps.io.writeOut : deps.io.writeErr,
      globals.json ? renderErrorJson(error) : formatError(error),
    );
    return exitCodeForError(error);
  };
  try {
    if (options.draft !== undefined || !options.stateRoot || !options.effort)
      return fail(
        taskFailure(
          "TASK_SELECTION_INVALID",
          "Managed decomposition requires --state-root and --effort, without --draft.",
        ).error,
      );
    const loaded = await loadTaskReview({
      review: options.review,
      deps,
      ...(options.root ? { root: options.root } : {}),
      ...(options.preferences ? { preferences: options.preferences } : {}),
    });
    if (!loaded.success) return fail(loaded.error);
    const { review, repository, preferences } = loaded.data;
    const phase = await checkReviewedPhase(review, repository, {
      ...(options.heading ? { heading: options.heading } : {}),
      ...(options.lines ? { lines: options.lines } : {}),
    });
    if (!phase.success) return fail(phase.error);
    if (
      preferences.executionMode !== "managed" ||
      !preferences.providerAvailability.some(
        (p) => p.enabled && p.modelProfileIds.includes("gpt-6.1-sol"),
      )
    )
      return fail(
        taskFailure(
          "TASK_PROVIDER_UNAVAILABLE",
          "Managed preferences must enable the fixed gpt-6.1-sol transport.",
        ).error,
      );
    if (
      !["low", "medium", "high", "xhigh", "max"].includes(options.effort) ||
      (preferences.effortPreference.type === "explicit" &&
        preferences.effortPreference.nativeEffortId !== options.effort)
    )
      return fail(
        taskFailure(
          "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
          "Explicit supported native effort must match reviewed preferences.",
        ).error,
      );
    const output = options.maxOutputTokens ?? "4096",
      timeout = options.timeoutMs ?? "120000";
    const maxOutputTokens = Number(output),
      timeoutMs = Number(timeout);
    if (
      !/^[1-9][0-9]*$/.test(output) ||
      !/^[1-9][0-9]*$/.test(timeout) ||
      maxOutputTokens > 16384 ||
      timeoutMs > 120000
    )
      return fail(
        taskFailure("TASK_PREFERENCES_INVALID", "Output/deadline ceilings exceed 16384/120000.")
          .error,
      );
    const packet = await prepareTaskCompilationContext({ review, repository });
    if (!packet.success) return fail(packet.error);
    const root = path.resolve(deps.cwd, options.root ?? ".");
    const configuration = {
      adapterId: "openai-responses-v1",
      providerId: "openai-responses-v1",
      modelProfileId: "gpt-6.1-sol",
      nativeEffortId: options.effort,
    };
    const compilationId = taskCompilationAllowanceId(review);
    const summary = {
      version: 1,
      kind: "task_managed_compilation_review",
      compilationId,
      reviewHash: taskContentHash(review),
      contextId: packet.data.contextId,
      sources: packet.data.sources,
      inventory: packet.data.inventory,
      phase: review.phase,
      authority: review.policy,
      configuration,
      resourceLimits: preferences.resourceLimits,
      maxOutputTokens,
      timeoutMs,
      priceCatalogRevision: PROVIDER_PRICE_REVISION,
      paths: { projectRoot: root, stateRoot: path.resolve(deps.cwd, options.stateRoot) },
      liveQualification: "unconfirmed",
      baselineGit: "not_checked",
      verification: "not_checked",
      disclosure:
        "Selected source bodies and complete applicable rules are sent to OpenAI. store:false does not imply zero retention; abuse logs may remain up to 30 days and encrypted cache state up to 24 hours. One call is reserved before dispatch; identical approval never repeats it. Failed/unknown calls require manual review. Compilation allowance is included when this managed receipt is used by task run. No project files or commands are generated/executed by decomposition.",
    };
    const summaryId = taskContentHash(summary);
    if (options.dryRun) {
      writeLine(
        deps.io.writeOut,
        globals.json
          ? JSON.stringify({ ...summary, summaryId, dryRun: true, runId: null, attemptId: null })
          : `Managed compilation review ${summaryId}\nCompilation ${compilationId}; explicit native effort ${options.effort}.\n${summary.disclosure}\nNo credentials, calls, state, locks, prompts or subprocesses. Use --json for complete review.`,
      );
      return 0;
    }
    if (!options.allowProviderUsage)
      return fail(
        taskFailure(
          "TASK_PROVIDER_ALLOWANCE_REQUIRED",
          "Review the preview and pass --allow-provider-usage.",
        ).error,
      );
    if (options.approveCompilation !== summaryId)
      return fail(
        taskFailure(
          "TASK_NEEDS_REVIEW",
          `Approve the exact reviewed summary with --approve-compilation ${summaryId}.`,
        ).error,
      );
    if (!/^v24\./.test(process.version) || !["darwin", "linux"].includes(process.platform))
      return fail(
        taskFailure(
          "TASK_PROFILE_UNSUPPORTED",
          "Managed compilation requires the reviewed Node 24 POSIX profile.",
        ).error,
      );
    if ((await realpath(root)) !== root)
      return fail(taskFailure("TASK_SCOPE_INVALID", "Compilation root must be canonical.").error);
    const host = await deps.createTaskCompilationHost({
      projectRoot: root,
      stateRoot: summary.paths.stateRoot,
      policy: review.policy,
      effort: options.effort,
    });
    if (!host.success) return fail(host.error);
    if (taskContentHash(host.data.provider.configuration) !== taskContentHash(configuration))
      return fail(
        taskFailure(
          "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED",
          "Host provider differs from the approved compilation configuration.",
        ).error,
      );
    const compiled = await executeTaskCompilation({
      review,
      ...host.data,
      resourceLimits: preferences.resourceLimits,
      initialDurationMs: Math.max(0, Math.ceil(performance.now() - started)),
      maxOutputTokens,
      timeoutMs,
      expectedContextId: packet.data.contextId,
      allowProviderUsage: true,
      ...(deps.signal ? { signal: deps.signal } : {}),
    });
    if (!compiled.success) return fail(compiled.error);
    if (compiled.data.dryRun || compiled.data.checkpoint.compilationId !== compilationId)
      return fail(
        taskFailure(
          "TASK_STATE_CONFLICT",
          "Compilation identity differs from reviewed host configuration.",
        ).error,
      );
    const receipt = {
      version: 1,
      kind: "task_compilation",
      dryRun: false,
      baselineGit: "not_checked",
      managedCompilationId: compilationId,
      plan: compiled.data.checkpoint.plan,
    };
    if (Buffer.byteLength(JSON.stringify(receipt)) + 1 > TASK_DOCUMENT_LIMITS.bytes)
      return fail(
        taskFailure(
          "TASK_PLAN_INVALID",
          "Compiled receipt exceeds its byte limit; private record is retained.",
        ).error,
      );
    writeLine(
      deps.io.writeOut,
      globals.json
        ? JSON.stringify(receipt)
        : `Compiled plan ${compiled.data.checkpoint.plan!.planId}; compilation ${compilationId}.\nThe model draft passed independent coverage, DAG and scope validation. Checks/Git remain unverified.\nUse --json to retain the compatible receipt with its compilation allowance identity.`,
    );
    return 0;
  } catch {
    return fail(
      taskFailure(
        "TASK_NEEDS_REVIEW",
        "Managed compilation stopped safely; inspect retained private state.",
      ).error,
    );
  }
}
