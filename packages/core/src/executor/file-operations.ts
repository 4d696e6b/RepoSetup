import path from "node:path";

import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import type {
  AddEnvExampleOperation,
  CreateDirectoryOperation,
  CreateFileOperation,
  ModifyJsonOperation,
  ModifyTextOperation,
} from "../operations/types.js";

import { appendEnvLines, existingEnvKeys, formatEnvLine, validateEnvEntry } from "./env-example.js";
import { mergeJsonObjects, parseJsonObject, stringifyJson } from "./json.js";
import { assertRealPathInsideRoot, resolveInsideRoot } from "./resolve-path.js";
import type { ExecutionContext } from "./types.js";

export async function executeCreateDirectory(
  operation: CreateDirectoryOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const resolved = resolveInsideRoot(context.rootDir, operation.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const realPath = await assertRealPathInsideRoot(
    context.rootDir,
    resolved.absolutePath,
    context.fs,
  );
  if (!realPath.ok) {
    return realPath.error;
  }

  const exists = await context.fs.exists(resolved.absolutePath);
  if (operation.behavior === "fail_if_exists" && exists) {
    return alreadyExists(operation.path);
  }

  if (exists) {
    if (await context.fs.isDirectory(resolved.absolutePath)) {
      return undefined;
    }

    return mutationFailed(`Path "${operation.path}" exists and is not a directory.`, {
      path: operation.path,
    });
  }

  try {
    await context.fs.mkdir(resolved.absolutePath);
  } catch (error) {
    return mutationFailed(`Could not create directory "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "mkdir failed",
    });
  }

  return undefined;
}

export async function executeCreateFile(
  operation: CreateFileOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const resolved = resolveInsideRoot(context.rootDir, operation.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const realPath = await assertRealPathInsideRoot(
    context.rootDir,
    resolved.absolutePath,
    context.fs,
  );
  if (!realPath.ok) {
    return realPath.error;
  }

  const exists = await context.fs.exists(resolved.absolutePath);
  if (operation.behavior === "fail_if_exists" && exists) {
    return alreadyExists(operation.path);
  }

  if (operation.behavior === "create_if_missing" && exists) {
    return undefined;
  }

  const parentError = await ensureParentDirectory(resolved.absolutePath, context);
  if (parentError !== undefined) {
    return parentError;
  }

  try {
    if (operation.behavior === "fail_if_exists") {
      await context.fs.writeFileExclusive(resolved.absolutePath, operation.content);
    } else {
      await context.fs.writeFile(resolved.absolutePath, operation.content);
    }
  } catch (error) {
    if (operation.behavior === "fail_if_exists" && isAlreadyExistsError(error)) {
      return alreadyExists(operation.path);
    }
    return mutationFailed(`Could not write file "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "write failed",
    });
  }

  return undefined;
}

export async function executeModifyJson(
  operation: ModifyJsonOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const resolved = resolveInsideRoot(context.rootDir, operation.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const realPath = await assertRealPathInsideRoot(
    context.rootDir,
    resolved.absolutePath,
    context.fs,
  );
  if (!realPath.ok) {
    return realPath.error;
  }

  if (!(await context.fs.exists(resolved.absolutePath))) {
    return mutationFailed(`JSON file "${operation.path}" does not exist.`, {
      path: operation.path,
    });
  }

  let content: string;
  try {
    content = await context.fs.readFile(resolved.absolutePath);
  } catch (error) {
    return mutationFailed(`Could not read JSON file "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "read failed",
    });
  }

  const parsed = parseJsonObject(content, operation.path);
  if (!parsed.ok) {
    return parsed.error;
  }

  try {
    await context.fs.writeFileAtomic(
      resolved.absolutePath,
      stringifyJson(mergeJsonObjects(parsed.value, operation.merge)),
    );
  } catch (error) {
    return mutationFailed(`Could not write JSON file "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "write failed",
    });
  }

  return undefined;
}

export async function executeModifyText(
  operation: ModifyTextOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  if (operation.oldText.length === 0) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: `Text replacement in "${operation.path}" cannot use an empty oldText.`,
      details: { path: operation.path },
      suggestion: "Provide the exact text to replace.",
    });
  }

  const resolved = resolveInsideRoot(context.rootDir, operation.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const realPath = await assertRealPathInsideRoot(
    context.rootDir,
    resolved.absolutePath,
    context.fs,
  );
  if (!realPath.ok) {
    return realPath.error;
  }

  if (!(await context.fs.exists(resolved.absolutePath))) {
    return mutationFailed(`Text file "${operation.path}" does not exist.`, {
      path: operation.path,
    });
  }

  let content: string;
  try {
    content = await context.fs.readFile(resolved.absolutePath);
  } catch (error) {
    return mutationFailed(`Could not read text file "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "read failed",
    });
  }

  const matches = content.split(operation.oldText).length - 1;
  if (matches === 0) {
    return mutationFailed(`Text to replace was not found in "${operation.path}".`, {
      path: operation.path,
    });
  }
  if (matches > 1) {
    return mutationFailed(`Text to replace matched more than once in "${operation.path}".`, {
      path: operation.path,
      matches,
    });
  }

  try {
    await context.fs.writeFileAtomic(
      resolved.absolutePath,
      content.replace(operation.oldText, operation.newText),
    );
  } catch (error) {
    return mutationFailed(`Could not write text file "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "write failed",
    });
  }

  return undefined;
}

export async function executeAddEnvExample(
  operation: AddEnvExampleOperation,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const resolved = resolveInsideRoot(context.rootDir, operation.path);
  if (!resolved.ok) {
    return resolved.error;
  }
  const realPath = await assertRealPathInsideRoot(
    context.rootDir,
    resolved.absolutePath,
    context.fs,
  );
  if (!realPath.ok) {
    return realPath.error;
  }

  for (const entry of operation.entries) {
    const invalid = validateEnvEntry(entry.key, entry.placeholder);
    if (invalid !== undefined) {
      return invalid;
    }
  }

  const exists = await context.fs.exists(resolved.absolutePath);
  let content = "";
  if (exists) {
    try {
      content = await context.fs.readFile(resolved.absolutePath);
    } catch (error) {
      return mutationFailed(`Could not read env example "${operation.path}".`, {
        path: operation.path,
        reason: error instanceof Error ? error.message : "read failed",
      });
    }
  }

  const present = existingEnvKeys(content);
  const lines: string[] = [];
  for (const entry of operation.entries) {
    if (present.has(entry.key)) {
      continue;
    }
    present.add(entry.key);
    lines.push(formatEnvLine(entry.key, entry.placeholder));
  }

  if (lines.length === 0) {
    return undefined;
  }

  const parentError = await ensureParentDirectory(resolved.absolutePath, context);
  if (parentError !== undefined) {
    return parentError;
  }

  try {
    await context.fs.writeFileAtomic(resolved.absolutePath, appendEnvLines(content, lines));
  } catch (error) {
    return mutationFailed(`Could not write env example "${operation.path}".`, {
      path: operation.path,
      reason: error instanceof Error ? error.message : "write failed",
    });
  }

  return undefined;
}

async function ensureParentDirectory(
  absoluteFilePath: string,
  context: ExecutionContext,
): Promise<RepoSetupError | undefined> {
  const parent = path.dirname(absoluteFilePath);
  const relative = path.relative(context.rootDir, parent);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return createRepoSetupError({
      code: "PLAN_INVALID",
      message: "Refusing to create a parent directory outside the project root.",
      details: { parent },
      suggestion: "Keep generated files inside the project root.",
    });
  }

  try {
    await context.fs.mkdir(parent);
  } catch (error) {
    return mutationFailed("Could not create a parent directory for a file write.", {
      parent,
      reason: error instanceof Error ? error.message : "mkdir failed",
    });
  }

  return undefined;
}

function alreadyExists(filePath: string): RepoSetupError {
  return createRepoSetupError({
    code: "FILE_ALREADY_EXISTS",
    message: `Refusing to overwrite existing path "${filePath}".`,
    details: { path: filePath },
    suggestion: "Choose a new project directory or remove the existing file.",
  });
}

function mutationFailed(message: string, details: Record<string, unknown>): RepoSetupError {
  return createRepoSetupError({
    code: "FILE_MUTATION_FAILED",
    message,
    details,
    suggestion: "Fix the file path or contents and re-run the plan.",
  });
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
