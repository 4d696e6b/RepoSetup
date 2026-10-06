import * as z from "zod";
import path from "node:path";
import { taskCheckFileDefinitionSchema } from "./verifier-files.js";
import { taskContentHash } from "./canonical.js";
import { taskHashSchema, taskIdSchema, taskPathSchema } from "./primitives.js";

const absolute = z
  .string()
  .min(1)
  .max(4096)
  .refine(
    (s) =>
      path.isAbsolute(s) &&
      path.normalize(s) === s &&
      ![...s].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
  );
/** Independent host authority only. Never loaded from plans, preferences, model output or task CLI artifacts. */
export const qualifiedTaskCheckSchema = z.strictObject({
  schemaVersion: z.literal(1),
  definitionRevision: taskHashSchema,
  fileDefinition: taskCheckFileDefinitionSchema,
  roots: z.record(taskIdSchema, absolute),
  immutableRootIds: z.array(taskIdSchema).min(1).max(128),
  closureInventoryRevision: taskHashSchema,
  nodeExecutable: absolute,
  nodeVersion: z.string().regex(/^v24\.[0-9]+\.[0-9]+$/),
  entryPoint: absolute,
  projectRoot: absolute,
  configPath: taskPathSchema,
  targets: z.array(taskPathSchema).max(1024),
  toolPackage: z.strictObject({ rootId: taskIdSchema, path: taskPathSchema }),
  testBindings: z
    .array(
      z.strictObject({
        testId: taskIdSchema,
        filePath: taskPathSchema,
        fullName: z.string().min(1).max(4096),
      }),
    )
    .max(4096),
});
export type QualifiedTaskCheck = z.infer<typeof qualifiedTaskCheckSchema>;
export function qualifiedTaskCheckHash(
  value: Omit<QualifiedTaskCheck, "definitionRevision">,
): string {
  return taskContentHash({
    ...value,
    immutableRootIds: [...value.immutableRootIds].sort(),
    targets: [...value.targets].sort(),
  });
}

export const taskTypeScriptCheckConfigSchema = z
  .object({
    compilerOptions: z
      .object({ composite: z.literal(false).optional(), incremental: z.literal(false).optional() })
      .passthrough(),
    extends: z.never().optional(),
    references: z.never().optional(),
  })
  .passthrough();
export function validateTaskToolMetadata(value: unknown, name: string, version: string): boolean {
  return z.object({ name: z.literal(name), version: z.literal(version) }).safeParse(value).success;
}
