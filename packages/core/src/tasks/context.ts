import { posix } from "node:path";
import * as z from "zod";
import { validateTaskPlan } from "./compile.js";
import { compareTaskIds, freezeTaskValue, taskContentHash } from "./canonical.js";
import {
  taskArtifactRevisionSchema,
  taskContextSchema,
  type TaskContext,
} from "./evidence-schema.js";
import { taskSourceRefSchema, taskPathSchema } from "./primitives.js";
import { taskFailure, type TaskParseResult } from "./parse.js";
import { taskCanRead } from "./scope.js";
import { scanLocalTaskImports, resolveLocalTaskImport } from "./context-imports.js";
import {
  TASK_CONTEXT_LIMITS,
  hasTaskSecretMaterial,
  selectTaskLines,
  taskByteHash,
} from "./context-text.js";
import type {
  TaskArtifactRevision,
  TaskMaterializedContext,
  TaskRepositoryReader,
} from "./context-types.js";

type Reason = TaskContext["sources"][number]["inclusionReasons"][number];
type Seed = {
  path: string;
  reason: Reason;
  required: boolean;
  fileHash?: string;
  lineRange?: { start: number; end: number } | undefined;
  depth: number;
};
const optionsSchema = z.strictObject({
  taskId: z.string(),
  acceptedArtifacts: z.array(taskArtifactRevisionSchema).max(512),
  requests: z.array(taskSourceRefSchema).max(128),
  maxContextBytes: z.number().int().positive().max(TASK_CONTEXT_LIMITS.maxContextBytes),
});

/** Select metadata and transient bodies through a read-only port. No process, provider or persistence effects. */
export async function prepareTaskContext(input: {
  plan: unknown;
  policy: unknown;
  taskId: string;
  repository: TaskRepositoryReader;
  acceptedArtifacts?: TaskArtifactRevision[];
  requests?: z.infer<typeof taskSourceRefSchema>[];
  maxContextBytes?: number;
}): Promise<TaskParseResult<TaskMaterializedContext>> {
  try {
    return await prepare(input);
  } catch {
    return taskFailure(
      "TASK_CONTEXT_UNRESOLVED",
      "Repository context could not be safely prepared.",
    );
  }
}
async function prepare(
  input: Parameters<typeof prepareTaskContext>[0],
): Promise<TaskParseResult<TaskMaterializedContext>> {
  const validated = validateTaskPlan(input.plan, input.policy);
  if (!validated.success) return validated;
  const plan = validated.data;
  const options = optionsSchema.safeParse({
    taskId: input.taskId,
    acceptedArtifacts: input.acceptedArtifacts ?? [],
    requests: input.requests ?? [],
    maxContextBytes: input.maxContextBytes ?? TASK_CONTEXT_LIMITS.maxContextBytes,
  });
  if (!options.success)
    return taskFailure(
      "TASK_SELECTION_INVALID",
      "Context options are invalid or exceed the support profile.",
    );
  const task = plan.tasks.find((item) => item.taskId === options.data.taskId);
  if (task === undefined)
    return taskFailure("TASK_REFERENCE_INVALID", "Context task is absent from the validated plan.");
  const inventoryScope = { read: task.scope.read, deny: task.scope.deny };
  const inventory = await input.repository.inventory(inventoryScope);
  if (!inventory.success) return inventory;
  if (inventory.data.rootIdentity !== plan.project.rootIdentity)
    return taskFailure("TASK_PROJECT_DRIFT", "Context repository identity differs from the plan.");
  if (inventory.data.entries.length > TASK_CONTEXT_LIMITS.maxInventoryEntries)
    return taskFailure("TASK_CONTEXT_LIMIT_EXCEEDED", "Repository inventory exceeds its bound.");
  const paths = new Set(
    inventory.data.entries.filter((entry) => entry.type === "file").map((entry) => entry.path),
  );
  if ([...paths].some((path) => !taskPathSchema.safeParse(path).success))
    return taskFailure("TASK_SCOPE_INVALID", "Repository inventory contains an invalid path.");
  const seeds: Seed[] = [];
  const sources = new Map<string, TaskContext["sources"][number]>();
  const texts = new Map<string, string>();
  const writeTargets: TaskMaterializedContext["writeTargets"] = [];
  const unresolved: TaskContext["unresolvedReferences"] = [];
  const add = (
    source: {
      path: string;
      fileHash?: string;
      lineRange?: { start: number; end: number } | undefined;
    },
    reason: Reason,
    required = true,
    depth = 0,
  ) => seeds.push({ ...source, reason, required, depth });
  add(
    {
      path: plan.phase.sourcePath,
      fileHash: plan.phase.sourceFileHash,
      lineRange: plan.phase.lineRange,
    },
    "requirement",
  );
  for (const requirement of plan.requirements.filter((item) =>
    task.requirementIds.includes(item.requirementId),
  ))
    for (const ref of requirement.sourceRefs) add(ref, "requirement");
  for (const ref of task.capabilityRequirements.evidenceRefs)
    if (ref.type === "source") add(ref.source, "interface");
  for (const request of options.data.requests) add(request, "explicit_reference");
  const artifacts: TaskArtifactRevision[] = [];
  const requiredEdges = plan.dependencies.filter((edge) => edge.consumerTaskId === task.taskId);
  for (const edge of requiredEdges)
    for (const artifactId of edge.requiredArtifactIds) {
      const matches = options.data.acceptedArtifacts.filter(
        (artifact) =>
          artifact.artifactId === artifactId && artifact.producerTaskId === edge.predecessorTaskId,
      );
      const expected = plan.tasks
        .find((item) => item.taskId === edge.predecessorTaskId)!
        .outputs.find((output) => output.artifactId === artifactId)!;
      if (
        matches.length !== 1 ||
        matches[0]!.paths.length !== new Set(expected.paths).size ||
        matches[0]!.paths.some((file) => !expected.paths.includes(file.path)) ||
        new Set(matches[0]!.paths.map((file) => file.path)).size !== matches[0]!.paths.length
      )
        return taskFailure(
          "TASK_CONTEXT_UNRESOLVED",
          "A dependency lacks one current accepted artifact revision.",
        );
      const artifact = matches[0]!;
      if (!artifact.attemptId.includes(`/${artifact.producerTaskId}/`))
        return taskFailure(
          "TASK_ARTIFACT_INVALID",
          "Accepted artifact attempt does not belong to its producer.",
        );
      artifacts.push(artifact);
      for (const file of artifact.paths) add(file, "predecessor_output");
    }
  for (const path of task.scope.write) {
    if (!taskCanRead(task, path))
      return taskFailure("TASK_SCOPE_VIOLATION", "Write preimage is outside permitted context.");
    const read = await input.repository.read(path);
    if (!read.success) return read;
    writeTargets.push({ path, fileHash: read.data?.fileHash ?? null });
    if (read.data !== null) add({ path, fileHash: read.data.fileHash }, "write_target");
    const stem = path.replace(/\.[^.]+$/, "");
    for (const candidate of [
      `${stem}.test.ts`,
      `${stem}.spec.ts`,
      `${posix.dirname(path)}/__tests__/${posix.basename(stem)}.test.ts`,
    ])
      if (paths.has(candidate) && taskCanRead(task, candidate))
        add({ path: candidate }, "nearby_test", false);
  }
  let materializedBytes = 0;
  for (let index = 0; index < seeds.length; index++) {
    const seed = seeds[index]!;
    if (index > TASK_CONTEXT_LIMITS.maxSources * 16)
      return taskFailure(
        "TASK_CONTEXT_LIMIT_EXCEEDED",
        "Context expansion exceeds its work bound.",
      );
    if (!taskCanRead(task, seed.path)) {
      if (seed.required)
        return taskFailure(
          "TASK_SCOPE_VIOLATION",
          "Required context exceeds reviewed read authority.",
        );
      unresolved.push({
        requestingTaskId: task.taskId,
        target: seed.path,
        reason: "Optional source exceeds permitted context.",
        required: false,
      });
      continue;
    }
    const read = await input.repository.read(seed.path);
    if (!read.success) return read;
    if (read.data === null) {
      if (seed.required)
        return taskFailure("TASK_CONTEXT_UNRESOLVED", "A required context source is absent.");
      unresolved.push({
        requestingTaskId: task.taskId,
        target: seed.path,
        reason: "Optional source is absent.",
        required: false,
      });
      continue;
    }
    const { text, fileHash } = read.data;
    if (Buffer.byteLength(text) > TASK_CONTEXT_LIMITS.maxFileBytes)
      return taskFailure("TASK_CONTEXT_LIMIT_EXCEEDED", "A context source exceeds its file bound.");
    if (
      taskByteHash(text) !== fileHash ||
      (seed.fileHash !== undefined && fileHash !== seed.fileHash) ||
      (sources.has(seed.path) && sources.get(seed.path)!.fileHash !== fileHash)
    )
      return taskFailure(
        "TASK_CONTEXT_STALE",
        "A context source no longer matches its expected bytes.",
      );
    if (hasTaskSecretMaterial(text))
      return taskFailure("TASK_SCOPE_VIOLATION", "Context source failed privacy screening.");
    const previous = sources.get(seed.path);
    // Validate every requested range before a full-file seed can subsume it.
    if (seed.lineRange !== undefined) selectTaskLines(text, seed.lineRange);
    const range =
      previous === undefined
        ? seed.lineRange
        : previous.lineRange === undefined || seed.lineRange === undefined
          ? undefined
          : {
              start: Math.min(previous.lineRange.start, seed.lineRange.start),
              end: Math.max(previous.lineRange.end, seed.lineRange.end),
            };
    const selected = selectTaskLines(text, range);
    if (
      seed.path === plan.phase.sourcePath &&
      taskByteHash(selectTaskLines(text, plan.phase.lineRange)) !== plan.phase.selectionHash
    )
      return taskFailure("TASK_CONTEXT_STALE", "Selected phase bytes no longer match the plan.");
    const byteLength = Buffer.byteLength(selected);
    materializedBytes += byteLength - (previous?.byteLength ?? 0);
    if (
      materializedBytes > options.data.maxContextBytes ||
      (!previous && sources.size >= TASK_CONTEXT_LIMITS.maxSources)
    )
      return taskFailure(
        "TASK_CONTEXT_LIMIT_EXCEEDED",
        "Required context exceeds its source or byte budget.",
      );
    sources.set(seed.path, {
      path: seed.path,
      fileHash,
      ...(range === undefined ? {} : { lineRange: range }),
      selectionHash: taskByteHash(selected),
      byteLength,
      inclusionReasons: [...new Set([...(previous?.inclusionReasons ?? []), seed.reason])].sort(),
      required: seed.required || (previous?.required ?? false),
    });
    texts.set(seed.path, selected);
    if (previous?.selectionHash === taskByteHash(selected) || !/\.[cm]?ts$/.test(seed.path))
      continue;
    const imports = scanLocalTaskImports(selected);
    if (imports.computed)
      unresolved.push({
        requestingTaskId: task.taskId,
        target: seed.path,
        reason:
          "Computed, absolute or aliased module references require explicit reviewed source references.",
        required: false,
      });
    for (const specifier of imports.specifiers) {
      const resolved = resolveLocalTaskImport(seed.path, specifier, paths);
      if (resolved === null || seed.depth >= TASK_CONTEXT_LIMITS.maxImportDepth) {
        unresolved.push({
          requestingTaskId: task.taskId,
          target: resolved ?? seed.path,
          reason:
            "Local import was unavailable or exceeded conservative expansion depth; provide an explicit reference if required.",
          required: false,
        });
      } else add({ path: resolved }, "local_import", false, seed.depth + 1);
    }
  }
  const rules: TaskContext["rules"] = [];
  const candidates = [...new Set([...sources.keys(), ...task.scope.write])].sort();
  for (const path of candidates) {
    let directory = posix.dirname(path);
    while (true) {
      const rulePath = directory === "." ? "AGENTS.md" : `${directory}/AGENTS.md`;
      if (paths.has(rulePath)) {
        if (!taskCanRead(task, rulePath))
          return taskFailure(
            "TASK_SCOPE_VIOLATION",
            "An applicable rule is outside approved read authority.",
          );
        const read = await input.repository.read(rulePath);
        if (!read.success) return read;
        if (read.data === null)
          return taskFailure("TASK_CONTEXT_STALE", "An applicable rule disappeared.");
        if (
          taskByteHash(read.data.text) !== read.data.fileHash ||
          (sources.has(rulePath) && sources.get(rulePath)!.fileHash !== read.data.fileHash)
        )
          return taskFailure(
            "TASK_CONTEXT_STALE",
            "An applicable rule changed during preparation.",
          );
        if (
          hasTaskSecretMaterial(read.data.text) ||
          Buffer.byteLength(read.data.text) > TASK_CONTEXT_LIMITS.maxFileBytes
        )
          return taskFailure(
            "TASK_SCOPE_VIOLATION",
            "An applicable rule failed context safety checks.",
          );
        rules.push({
          path: rulePath,
          fileHash: read.data.fileHash,
          applicabilityScope: { type: "file", path },
        });
        const previousRule = sources.get(rulePath);
        texts.set(rulePath, read.data.text);
        sources.set(rulePath, {
          path: rulePath,
          fileHash: read.data.fileHash,
          selectionHash: taskByteHash(read.data.text),
          byteLength: Buffer.byteLength(read.data.text),
          inclusionReasons: [
            ...new Set<Reason>([...(previousRule?.inclusionReasons ?? []), "applicable_rule"]),
          ].sort(),
          required: true,
        });
      }
      if (directory === ".") break;
      directory = posix.dirname(directory);
    }
  }
  const orderedSources = [...sources.values()].sort((a, b) => compareTaskIds(a.path, b.path));
  if (sources.size > TASK_CONTEXT_LIMITS.maxSources)
    return taskFailure(
      "TASK_CONTEXT_LIMIT_EXCEEDED",
      "Sources and required rules exceed the source-count bound.",
    );
  const files = [...texts]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, text]) => ({ path, text }));
  rules.sort((a, b) =>
    `${a.path}/${a.applicabilityScope.path}` < `${b.path}/${b.applicabilityScope.path}` ? -1 : 1,
  );
  const inputRevision = taskContentHash({
    planId: plan.planId,
    taskId: task.taskId,
    requirements: plan.requirements.filter((item) =>
      task.requirementIds.includes(item.requirementId),
    ),
    sources: orderedSources,
    rules,
    writeTargets,
    artifacts,
  });
  const payload = {
    kind: "task_context" as const,
    schemaVersion: 1 as const,
    planId: plan.planId,
    taskId: task.taskId,
    inputRevision,
    sources: orderedSources,
    rules,
    predecessorArtifacts: artifacts,
    size: { bytes: 0, estimatedInputTokens: 0, estimatorId: "utf8-byte-upper-bound-v1" },
    unresolvedReferences: unresolved,
  };
  let packet: TaskMaterializedContext;
  for (let i = 0; ; i++) {
    packet = { context: { ...payload, contextId: taskContentHash(payload) }, files, writeTargets };
    const bytes = Buffer.byteLength(JSON.stringify(packet));
    if (bytes > options.data.maxContextBytes || i > 8)
      return taskFailure(
        "TASK_CONTEXT_LIMIT_EXCEEDED",
        "Complete context packet exceeds its encoded budget.",
      );
    if (payload.size.bytes === bytes) break;
    payload.size = { ...payload.size, bytes, estimatedInputTokens: bytes };
  }
  const parsed = taskContextSchema.safeParse(packet.context);
  if (!parsed.success)
    return taskFailure(
      "TASK_CONTEXT_LIMIT_EXCEEDED",
      "Context metadata exceeds its bounded contract.",
    );
  const fresh = await checkTaskContextFreshness(packet, input.repository);
  if (!fresh.success) return fresh;
  const finalInventory = await input.repository.inventory(inventoryScope);
  if (!finalInventory.success) return finalInventory;
  const applicableRulePaths = (entries: typeof inventory.data.entries) =>
    entries
      .filter(
        (entry) =>
          entry.type === "file" &&
          /(?:^|\/)AGENTS\.md$/.test(entry.path) &&
          candidates.some(
            (candidate) =>
              entry.path === "AGENTS.md" || candidate.startsWith(`${posix.dirname(entry.path)}/`),
          ),
      )
      .map((entry) => entry.path)
      .sort();
  if (
    finalInventory.data.rootIdentity !== inventory.data.rootIdentity ||
    JSON.stringify(applicableRulePaths(finalInventory.data.entries)) !==
      JSON.stringify(applicableRulePaths(inventory.data.entries))
  )
    return taskFailure(
      "TASK_CONTEXT_STALE",
      "Applicable rule inventory changed during preparation.",
    );
  return { success: true, data: freezeTaskValue(packet) };
}

/** Pre-application input check only. Post-application evidence binding belongs to the executor/verifier. */
export async function checkTaskContextFreshness(
  packet: TaskMaterializedContext,
  repository: TaskRepositoryReader,
): Promise<TaskParseResult<true>> {
  try {
    const targets = [
      ...new Set([
        ...packet.context.sources.map((source) => source.path),
        ...packet.writeTargets.map((target) => target.path),
      ]),
    ];
    const inventory = await repository.inventory({
      read: targets.map((path) => ({ type: "file" as const, path })),
      deny: [],
    });
    if (!inventory.success) return inventory;
    const currentRules = inventory.data.entries
      .filter(
        (entry) =>
          entry.type === "file" &&
          /(?:^|\/)AGENTS\.md$/.test(entry.path) &&
          targets.some(
            (target) =>
              entry.path === "AGENTS.md" || target.startsWith(`${posix.dirname(entry.path)}/`),
          ),
      )
      .map((entry) => entry.path)
      .sort();
    if (
      JSON.stringify([...new Set(currentRules)]) !==
      JSON.stringify([...new Set(packet.context.rules.map((rule) => rule.path))].sort())
    )
      return taskFailure(
        "TASK_CONTEXT_STALE",
        "Applicable rule inventory changed since context selection.",
      );
    for (const source of packet.context.sources) {
      const read = await repository.read(source.path);
      if (!read.success) return read;
      if (
        read.data === null ||
        taskByteHash(read.data.text) !== read.data.fileHash ||
        read.data.fileHash !== source.fileHash ||
        taskByteHash(selectTaskLines(read.data.text, source.lineRange)) !== source.selectionHash
      )
        return taskFailure(
          "TASK_CONTEXT_STALE",
          "A selected source or applicable rule changed during context preparation.",
        );
    }
    for (const target of packet.writeTargets) {
      const read = await repository.read(target.path);
      if (!read.success) return read;
      if ((read.data?.fileHash ?? null) !== target.fileHash)
        return taskFailure(
          "TASK_CONTEXT_STALE",
          "A writable preimage changed during context preparation.",
        );
    }
    return { success: true, data: true };
  } catch {
    return taskFailure("TASK_CONTEXT_STALE", "Context freshness could not be established.");
  }
}
