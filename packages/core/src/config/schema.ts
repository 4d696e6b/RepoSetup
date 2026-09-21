import * as z from "zod";

import { isSafeProjectName, isSafeProjectRelativePath } from "../paths/project-path.js";
import { PACKAGE_MANAGERS, RUNTIME_IDS } from "./types.js";

const jsonObjectSchema = z.record(z.string(), z.unknown());

const projectNameSchema = z.string().min(1).refine(isSafeProjectName, {
  message: "Project name must be a single path segment without separators or traversal",
});

const projectPathSchema = z.string().min(1).refine(isSafeProjectRelativePath, {
  message: "Project path must be relative to the current directory and cannot contain '..'",
});

export const projectConfigSchema = z.strictObject({
  name: projectNameSchema,
  path: projectPathSchema.optional(),
});

export const runtimeConfigSchema = z.strictObject({
  id: z.enum(RUNTIME_IDS),
  version: z.string().min(1).optional(),
});

export const frameworkConfigSchema = z.strictObject({
  id: z.string().min(1),
  options: jsonObjectSchema.optional(),
});

export const integrationSelectionSchema = z.strictObject({
  id: z.string().min(1),
  options: jsonObjectSchema.optional(),
});

export const packageManagerSchema = z.enum(PACKAGE_MANAGERS);

export const repoSetupConfigSchema = z.strictObject({
  schemaVersion: z.literal(1),
  project: projectConfigSchema,
  runtime: runtimeConfigSchema,
  packageManager: packageManagerSchema,
  framework: frameworkConfigSchema,
  integrations: z.array(integrationSelectionSchema),
});
