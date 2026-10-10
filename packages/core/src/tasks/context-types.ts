import type { TaskContext, taskArtifactRevisionSchema } from "./evidence-schema.js";
import type { TaskParseResult } from "./parse.js";
import type { TaskSelector } from "./scope.js";
import type { z } from "zod";

export type TaskRepositoryInventory = {
  rootIdentity: string;
  entries: { path: string; type: "file" | "directory"; byteLength: number }[];
};
/** Read-only port. Implementations enforce canonical identity, bounds and privacy before returning bodies. */
export interface TaskRepositoryReader {
  inventory(scope: {
    read: TaskSelector[];
    deny: TaskSelector[];
  }): Promise<TaskParseResult<TaskRepositoryInventory>>;
  read(path: string): Promise<TaskParseResult<{ fileHash: string; text: string } | null>>;
}
export type TaskArtifactRevision = z.infer<typeof taskArtifactRevisionSchema>;
export type TaskMaterializedContext = {
  context: TaskContext;
  files: { path: string; text: string }[];
  writeTargets: { path: string; fileHash: string | null }[];
};
