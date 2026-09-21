import * as z from "zod";

import { packageManagerSchema } from "../config/schema.js";
import { isSafeProjectRelativePath } from "../paths/project-path.js";
import { FILE_WRITE_BEHAVIORS } from "./types.js";

const projectRelativePathSchema = z.string().min(1).refine(isSafeProjectRelativePath, {
  message: "Operation paths must stay inside the project root",
});

const descriptionSchema = z.string().min(1);

export const checkPrerequisiteOperationSchema = z.strictObject({
  type: z.literal("check_prerequisite"),
  id: z.string().min(1),
  description: descriptionSchema,
});

export const installPackageOperationSchema = z.strictObject({
  type: z.literal("install_package"),
  packageManager: packageManagerSchema,
  packages: z.array(z.string().min(1)).min(1),
  cwd: projectRelativePathSchema,
  description: descriptionSchema,
  dev: z.boolean().optional(),
  requiresNetwork: z.boolean().optional(),
});

export const runCommandOperationSchema = z.strictObject({
  type: z.literal("run_command"),
  command: z.string().min(1),
  args: z.array(z.string()),
  cwd: projectRelativePathSchema,
  description: descriptionSchema,
  requiresNetwork: z.boolean().optional(),
  interactive: z.boolean().optional(),
  longRunning: z.boolean().optional(),
});

export const createDirectoryOperationSchema = z.strictObject({
  type: z.literal("create_directory"),
  path: projectRelativePathSchema,
  behavior: z.enum(["fail_if_exists", "create_if_missing"]),
  description: descriptionSchema,
});

export const createFileOperationSchema = z.strictObject({
  type: z.literal("create_file"),
  path: projectRelativePathSchema,
  content: z.string(),
  behavior: z.enum(FILE_WRITE_BEHAVIORS),
  description: descriptionSchema,
});

export const modifyJsonOperationSchema = z.strictObject({
  type: z.literal("modify_json"),
  path: projectRelativePathSchema,
  merge: z.record(z.string(), z.unknown()),
  behavior: z.literal("merge"),
  description: descriptionSchema,
});

export const modifyTextOperationSchema = z.strictObject({
  type: z.literal("modify_text"),
  path: projectRelativePathSchema,
  oldText: z.string(),
  newText: z.string(),
  description: descriptionSchema,
});

export const addEnvExampleOperationSchema = z.strictObject({
  type: z.literal("add_env_example"),
  path: projectRelativePathSchema,
  entries: z
    .array(
      z.strictObject({
        key: z.string().min(1),
        placeholder: z.string().min(1),
      }),
    )
    .min(1),
  description: descriptionSchema,
});

export const showMessageOperationSchema = z.strictObject({
  type: z.literal("show_message"),
  message: z.string().min(1),
  description: descriptionSchema,
});

export const verifyOperationSchema = z.strictObject({
  type: z.literal("verify"),
  cwd: projectRelativePathSchema,
  description: descriptionSchema,
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
});

export const installationOperationSchema = z.discriminatedUnion("type", [
  checkPrerequisiteOperationSchema,
  installPackageOperationSchema,
  runCommandOperationSchema,
  createDirectoryOperationSchema,
  createFileOperationSchema,
  modifyJsonOperationSchema,
  modifyTextOperationSchema,
  addEnvExampleOperationSchema,
  showMessageOperationSchema,
  verifyOperationSchema,
]);
