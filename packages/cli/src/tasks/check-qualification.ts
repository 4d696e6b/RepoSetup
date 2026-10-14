import path from "node:path";
import {
  qualifiedTaskCheckSchema,
  qualifiedTaskCheckHash,
  taskTypeScriptCheckConfigSchema,
  validateTaskToolMetadata,
  type QualifiedTaskCheck,
  taskFailure,
  decodeTaskJson,
  type TaskParseResult,
} from "@reposetup/core";
import {
  createTaskCheckRecipe,
  TASK_TOOL_VERSIONS,
  TASK_TOOL_ENTRY_PATHS,
  taskTestIdentity,
} from "./check-recipes.js";
import { verifyTaskCheckFileDefinition } from "./verifier-definition.js";
import { readTaskClosureInventory } from "./verifier-closure.js";
import { captureVerifierRoot, readVerifierFile } from "./verifier-read.js";

export async function verifyQualifiedTaskCheck(
  value: unknown,
  readInventory: typeof readTaskClosureInventory = readTaskClosureInventory,
): Promise<TaskParseResult<QualifiedTaskCheck>> {
  try {
    const parsed = qualifiedTaskCheckSchema.safeParse(value);
    if (!parsed.success)
      return taskFailure("TASK_CHECK_BLOCKED", "Qualified check authority is invalid.");
    const q = parsed.data;
    const { definitionRevision, ...payload } = q;
    if (qualifiedTaskCheckHash(payload) !== definitionRevision)
      return taskFailure("TASK_CHECK_DEFINITION_CHANGED", "Qualified check identity changed.");
    if (
      q.nodeExecutable !== process.execPath ||
      q.nodeVersion !== process.version ||
      !["linux", "darwin"].includes(process.platform)
    )
      return taskFailure(
        "TASK_PROFILE_UNSUPPORTED",
        "Run the verifier with its reviewed Node 24 POSIX runtime.",
      );
    const immutable = Object.fromEntries(q.immutableRootIds.map((id) => [id, q.roots[id]]));
    if (
      new Set(q.immutableRootIds).size !== q.immutableRootIds.length ||
      q.immutableRootIds.some((id) => !q.roots[id] || q.roots[id] === q.projectRoot)
    )
      throw new Error("roots");
    for (const role of ["runtime", "tool_entry", "configuration"] as const) {
      const files = q.fileDefinition.files.filter((f) => f.role === role);
      if (files.length !== 1) throw new Error("role");
      const file = files[0]!;
      const actual = path.join(q.roots[file.rootId]!, file.path);
      const expected =
        role === "runtime"
          ? q.nodeExecutable
          : role === "tool_entry"
            ? q.entryPoint
            : path.join(q.projectRoot, q.configPath);
      if (
        actual !== expected ||
        (role === "tool_entry" && !q.immutableRootIds.includes(file.rootId))
      )
        throw new Error("launch binding");
    }
    if (
      !q.immutableRootIds.includes(q.toolPackage.rootId) ||
      !q.fileDefinition.files.some(
        (f) => f.rootId === q.toolPackage.rootId && f.path === q.toolPackage.path,
      )
    )
      throw new Error("tool metadata");
    const expectedEntry = path.join(
      path.dirname(path.join(q.roots[q.toolPackage.rootId]!, q.toolPackage.path)),
      TASK_TOOL_ENTRY_PATHS[q.fileDefinition.checkId],
    );
    if (q.entryPoint !== expectedEntry) throw new Error("fixed package entry");
    if (q.fileDefinition.checkId === "ts.unit") {
      if (
        q.testBindings.length === 0 ||
        new Set(q.testBindings.map((b) => b.testId)).size !== q.testBindings.length ||
        q.testBindings.some(
          (b) =>
            taskTestIdentity(b.filePath, b.fullName) !== b.testId ||
            !q.fileDefinition.files.some(
              (f) =>
                f.role === "oracle" && q.roots[f.rootId] === q.projectRoot && f.path === b.filePath,
            ),
        )
      )
        throw new Error("unfrozen required tests");
    } else if (q.testBindings.length !== 0) throw new Error("unexpected test bindings");
    // The normalization placeholders bind flags without allocating scratch during qualification.
    const placeholder = path.join(
      path.parse(q.projectRoot).root,
      "reposetup-qualification-scratch",
    );
    const recipe = createTaskCheckRecipe({
      ...q,
      checkId: q.fileDefinition.checkId,
      homeDirectory: placeholder,
      temporaryDirectory: placeholder,
    });
    const files = await verifyTaskCheckFileDefinition(
      q.fileDefinition,
      q.roots,
      recipe.recipeRevision,
    );
    if (!files.success) return files;
    const inventory = await readInventory(immutable as Record<string, string>);
    if (!inventory.success) return inventory;
    if (inventory.data.revision !== q.closureInventoryRevision)
      return taskFailure(
        "TASK_CHECK_DEFINITION_CHANGED",
        "Reviewed immutable dependency inventory changed.",
      );
    const root = await captureVerifierRoot(q.roots[q.toolPackage.rootId]!);
    const metadata = await readVerifierFile(root, q.toolPackage.path, 65536, true);
    const decoded = decodeTaskJson(metadata.bytes);
    const name = { "ts.typecheck": "typescript", "ts.lint": "eslint", "ts.unit": "vitest" }[
      q.fileDefinition.checkId
    ];
    if (
      !decoded.success ||
      !validateTaskToolMetadata(decoded.data, name, TASK_TOOL_VERSIONS[q.fileDefinition.checkId])
    )
      throw new Error("pinned metadata");
    const configFile = q.fileDefinition.files.find((f) => f.role === "configuration")!;
    if (q.fileDefinition.checkId === "ts.typecheck") {
      const config = await readVerifierFile(
        await captureVerifierRoot(q.roots[configFile.rootId]!),
        configFile.path,
        65536,
        true,
      );
      const json = decodeTaskJson(config.bytes);
      // The initial profile deliberately excludes inherited/build/project-reference configs.
      if (!json.success || !taskTypeScriptCheckConfigSchema.safeParse(json.data).success)
        throw new Error("build config");
    }
    return { success: true, data: q };
  } catch {
    return taskFailure(
      "TASK_CHECK_BLOCKED",
      "Qualified runtime/tool/config bindings are unsafe or unsupported.",
    );
  }
}
