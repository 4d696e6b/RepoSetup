import path from "node:path";
import { realpath } from "node:fs/promises";
import {
  prepareTaskContext,
  taskContentHash,
  taskFailure,
  executeManagedTaskPhase,
  type RepoSetupError,
  type TaskRunAdapter,
  type TaskProviderAdapter,
  type TaskVerificationAdapter,
  type TaskParseResult,
  type TaskCompilationPolicy,
} from "@reposetup/core";
import { loadTaskReview, loadReviewedPlan, checkReviewedPhase } from "./input.js";
import { loadManagedTaskAuthority, type ManagedTaskAuthority } from "./managed-authority.js";
import { createTaskRunAdapter } from "./application-adapter.js";
import { createQualifiedTaskVerificationAdapter } from "./verification-adapter.js";
import { createOpenAITaskProvider, PROVIDER_PRICE_REVISION } from "./provider-adapter.js";
import { CLI_OUTPUT_VERSION, renderErrorJson } from "../machine-output.js";
import { exitCodeForError } from "../exit-codes.js";
import { writeLine } from "../io.js";
import { formatError } from "../format-error.js";
import { resolveTaskGitExecutable } from "./git-resolver.js";
import { validateManagedTaskProject } from "./managed-project.js";
import type { GlobalCliOptions, ResolvedCliDeps } from "../types.js";

export type TaskManagedOptions = {
  review: string;
  plan: string;
  authority: string;
  stateRoot: string;
  scratchRoot: string;
  root?: string;
  preferences?: string;
  effort: string;
  maxOutputTokens: string;
  timeoutMs: string;
  allowProviderUsage?: boolean;
  approveRun?: string;
  dryRun: boolean;
};
export type TaskManagedHostFactory = (input: {
  projectRoot: string;
  stateRoot: string;
  scratchRoot: string;
  effort: string;
  authority: ManagedTaskAuthority;
  compilationPolicy: TaskCompilationPolicy;
  review: NonNullable<TaskVerificationAdapter["review"]>;
}) => Promise<
  TaskParseResult<{
    adapter: TaskRunAdapter;
    provider: TaskProviderAdapter;
    verification: TaskVerificationAdapter;
    gitExecutable: string;
  }>
>;
/** Read-only factory. All mutations, processes and HTTP dispatch remain executor-invoked. */
export const createDefaultManagedTaskHost: TaskManagedHostFactory = async (input) => {
  const profile = await validateManagedTaskProject(
    input.projectRoot,
    input.compilationPolicy.authority.write,
  );
  if (!profile.success) return profile;
  const adapter = await createTaskRunAdapter({
    projectRoot: input.projectRoot,
    stateRoot: input.stateRoot,
    authority: input.compilationPolicy.authority,
  });
  if (!adapter.success) return adapter;
  const verification = await createQualifiedTaskVerificationAdapter({
    projectRoot: input.projectRoot,
    scratchParent: input.scratchRoot,
    policy: input.authority.policy,
    checks: input.authority.checks,
    review: input.review,
  });
  if (!verification.success) return verification;
  const gitExecutable = await resolveTaskGitExecutable();
  if (!gitExecutable)
    return taskFailure("TASK_PREREQUISITE_MISSING", "Git must be preinstalled on the host PATH.");
  const provider = createOpenAITaskProvider({ model: "gpt-6.1-sol", effort: input.effort });
  if (!provider.success) return provider;
  return {
    success: true,
    data: {
      adapter: adapter.data,
      verification: verification.data,
      provider: provider.data,
      gitExecutable,
    },
  };
};
export async function handleManagedTask(
  options: TaskManagedOptions,
  deps: ResolvedCliDeps,
  globals: GlobalCliOptions,
): Promise<number> {
  const fail = (error: RepoSetupError, runId?: string | null) => {
    writeLine(
      globals.json ? deps.io.writeOut : deps.io.writeErr,
      globals.json
        ? JSON.stringify({
            ...JSON.parse(renderErrorJson(error)),
            ...(runId
              ? {
                  runId,
                  stateAuthority: "executor_durable_checkpoint",
                  stateStatus: "inspect_required",
                }
              : {}),
          })
        : `${formatError(error)}${runId ? `\nRun ${runId}; inspect retained private state and project effects.` : ""}`,
    );
    return exitCodeForError(error);
  };
  try {
    const loaded = await loadTaskReview({
      review: options.review,
      ...(options.root ? { root: options.root } : {}),
      ...(options.preferences ? { preferences: options.preferences } : {}),
      deps,
    });
    if (!loaded.success) return fail(loaded.error);
    const { review, repository, preferences } = loaded.data;
    const phase = await checkReviewedPhase(review, repository);
    if (!phase.success) return fail(phase.error);
    const plan = await loadReviewedPlan(options.plan, review, deps);
    if (!plan.success) return fail(plan.error);
    const authority = await loadManagedTaskAuthority(options.authority, deps);
    if (!authority.success) return fail(authority.error);
    if (authority.data.authority.policy.catalogRevision !== plan.data.checkCatalogRevision)
      return fail(
        taskFailure(
          "TASK_CHECK_DEFINITION_CHANGED",
          "Independent host check catalog differs from the reviewed plan.",
        ).error,
      );
    if (
      preferences.executionMode !== "managed" ||
      !preferences.providerAvailability.some(
        (p) => p.enabled && p.modelProfileIds.includes("gpt-6.1-sol"),
      )
    )
      return fail(
        taskFailure(
          "TASK_PROVIDER_UNAVAILABLE",
          "Managed preferences must explicitly enable the fixed gpt-6.1-sol transport.",
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
          "Review a supported native effort independently from the fixed model choice.",
        ).error,
      );
    const maxOutputTokens = Number(options.maxOutputTokens),
      timeoutMs = Number(options.timeoutMs);
    if (
      !/^[1-9][0-9]*$/.test(options.maxOutputTokens) ||
      !/^[1-9][0-9]*$/.test(options.timeoutMs) ||
      maxOutputTokens > 16384 ||
      timeoutMs > 120000
    )
      return fail(
        taskFailure(
          "TASK_PREFERENCES_INVALID",
          "Output tokens/deadline must be positive integers within 16384/120000.",
        ).error,
      );
    const contexts = [];
    // Dependent bodies cannot be prepared before their accepted artifacts exist.
    for (const taskId of plan.data.orderedTaskIds) {
      if (plan.data.dependencies.some((d) => d.consumerTaskId === taskId)) {
        contexts.push({ taskId, status: "deferred_until_predecessor_acceptance" });
        continue;
      }
      const context = await prepareTaskContext({
        plan: plan.data,
        policy: review.policy,
        taskId,
        repository,
      });
      if (!context.success) return fail(context.error);
      contexts.push({ taskId, status: "prepared_read_only", context: context.data.context });
    }
    const root = path.resolve(deps.cwd, options.root ?? ".");
    const summary = {
      version: CLI_OUTPUT_VERSION,
      kind: "task_managed_run_review",
      planId: plan.data.planId,
      authorityId: authority.data.authorityId,
      contexts,
      provider: {
        providerId: "openai-responses-v1",
        model: "gpt-6.1-sol",
        nativeEffortId: options.effort,
        maxOutputTokens,
        timeoutMs,
        priceCatalogRevision: PROVIDER_PRICE_REVISION,
        liveQualification: "unconfirmed",
        effectiveConfiguration: { provenance: "unknown" },
      },
      checks: authority.data.authority.policy.definitions,
      budgets: preferences.resourceLimits,
      paths: {
        projectRoot: root,
        stateRoot: path.resolve(deps.cwd, options.stateRoot),
        scratchRoot: path.resolve(deps.cwd, options.scratchRoot),
      },
      scopes: plan.data.tasks.map((t) => ({
        taskId: t.taskId,
        scope: t.scope,
        criteria: t.criteria,
      })),
      disclosure:
        "Scoped source bodies are sent to OpenAI. store:false does not imply zero retention; abuse logs may remain up to 30 days and encrypted prompt-cache state up to 24 hours. Costs are conservative estimates including cache-write allowance, not reported bills. Context requests stay in reviewed read scope. No automatic retry, repair, installation or rollback.",
      baselineGit: "not_checked",
      toolAvailability: "not_checked",
      verification: "not_checked",
    };
    const summaryId = taskContentHash(summary);
    if (options.dryRun) {
      writeLine(
        deps.io.writeOut,
        globals.json
          ? JSON.stringify({ ...summary, summaryId, dryRun: true, runId: null, attemptId: null })
          : `Managed run review ${summaryId}\nProvider: gpt-6.1-sol; native effort: ${options.effort}; live qualification unconfirmed.\nTasks: ${plan.data.orderedTaskIds.join(", ")}; checks: ${authority.data.authority.policy.definitions.map((d) => d.checkId).join(", ")}\nLimits: ${JSON.stringify(preferences.resourceLimits)}\n${summary.disclosure}\nNo credentials, calls, writes, attempts, locks, prompts or processes. Use --json to inspect the complete review.`,
      );
      return 0;
    }
    if (!options.allowProviderUsage)
      return fail(
        taskFailure(
          "TASK_PROVIDER_ALLOWANCE_REQUIRED",
          "Review the dry-run summary and explicitly pass --allow-provider-usage.",
        ).error,
      );
    if (options.approveRun !== summaryId)
      return fail(
        taskFailure(
          "TASK_NEEDS_REVIEW",
          `Pass --approve-run ${summaryId} only after reviewing this exact dry-run summary and independent host authority.`,
        ).error,
      );
    if (!/^v24\./.test(process.version) || !["darwin", "linux"].includes(process.platform))
      return fail(
        taskFailure(
          "TASK_PROFILE_UNSUPPORTED",
          "Managed execution requires the reviewed Node 24 POSIX support profile.",
        ).error,
      );
    if ((await realpath(root)) !== root)
      return fail(
        taskFailure("TASK_SCOPE_INVALID", "Managed project root must be canonical.").error,
      );
    const host = await deps.createTaskManagedHost({
      projectRoot: root,
      stateRoot: summary.paths.stateRoot,
      scratchRoot: summary.paths.scratchRoot,
      effort: options.effort,
      authority: authority.data.authority,
      compilationPolicy: review.policy,
      review: async (request) => {
        const criteria = [
          ...plan.data.tasks.flatMap((t) => t.criteria),
          ...plan.data.phaseCriteria,
        ];
        const approved = await deps.confirmCreate(
          `Independent ${request.checkId} review at ${request.checkedRevision}:\n${request.criterionIds.map((id) => `${id}: ${JSON.stringify(criteria.find((c) => c.criterionId === id)?.statement ?? "Unresolved criterion")}`).join("\n")}\nApprove only after inspecting the resulting code and frozen acceptance evidence.`,
        );
        const definition = authority.data.authority.policy.definitions.find(
          (d) => d.checkId === request.checkId,
        )!;
        return {
          request,
          approved,
          evidenceArtifactIds: approved ? definition.evidenceArtifactIds : [],
        };
      },
    });
    if (!host.success) return fail(host.error);
    const result = await executeManagedTaskPhase({
      plan: plan.data,
      compilationPolicy: review.policy,
      resourceLimits: preferences.resourceLimits,
      projectRoot: root,
      gitExecutable: host.data.gitExecutable,
      adapter: host.data.adapter,
      provider: host.data.provider,
      verification: {
        policy: authority.data.authority.policy,
        adapter: host.data.verification,
        runProcess: deps.runProcess,
      },
      allowProviderUsage: true,
      maxOutputTokens,
      timeoutMs,
      ...(deps.signal ? { signal: deps.signal } : {}),
    });
    if (!result.success) return fail(result.error, result.runId);
    writeLine(
      deps.io.writeOut,
      globals.json
        ? JSON.stringify({
            version: CLI_OUTPUT_VERSION,
            kind: "task_managed_run",
            dryRun: false,
            summaryId,
            stateAuthority: "executor_durable_checkpoint",
            run: result.checkpoint.run,
          })
        : `Run ${result.checkpoint.run.runId}: succeeded with fresh task and phase acceptance.\nProvider capability/live qualification remains separately recorded; requested and effective configuration/usage are in private run state.`,
    );
    return 0;
  } catch {
    return fail(
      taskFailure(
        "TASK_NEEDS_REVIEW",
        "Managed run stopped safely; inspect private state and retain project effects.",
      ).error,
    );
  }
}
