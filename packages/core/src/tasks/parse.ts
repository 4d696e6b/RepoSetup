import { TextDecoder } from "node:util";
import * as z from "zod";
import { createRepoSetupError, type RepoSetupError } from "../errors/model.js";
import { type TaskErrorCode } from "./errors.js";
import { taskContentHash } from "./canonical.js";
import { taskChangeSetSchema } from "./change-schema.js";
import { taskContextSchema, taskRoutingSchema, taskVerificationSchema } from "./evidence-schema.js";
import {
  taskHandoffResultSchema,
  taskHandoffSchema,
  taskProviderReplySchema,
} from "./handoff-schema.js";
import { taskPlanDraftSchema, taskPlanSchema } from "./plan-schema.js";
import { taskPreferencesSchema } from "./preferences-schema.js";
import { executionAttemptSchema, phaseRunSchema } from "./run-schema.js";
import { isWellFormedTaskString, TASK_DOCUMENT_LIMITS } from "./primitives.js";

export const taskDocumentSchema = z.union([
  taskPlanDraftSchema,
  taskPlanSchema,
  taskPreferencesSchema,
  taskContextSchema,
  taskRoutingSchema,
  taskVerificationSchema,
  executionAttemptSchema,
  phaseRunSchema,
  taskChangeSetSchema,
  taskHandoffSchema,
  taskHandoffResultSchema,
  taskProviderReplySchema,
]);
export type TaskDocument = z.infer<typeof taskDocumentSchema>;
export type TaskParseResult<T> =
  { success: true; data: T } | { success: false; error: RepoSetupError };

const codeByKind: Record<string, TaskErrorCode> = {
  task_plan_draft: "TASK_DRAFT_INVALID",
  task_plan: "TASK_PLAN_INVALID",
  task_preferences: "TASK_PREFERENCES_INVALID",
  phase_run: "TASK_RUN_STATE_INVALID",
  execution_attempt: "TASK_RUN_STATE_INVALID",
  change_set: "TASK_CHANGESET_INVALID",
};
const identityByKind: Record<string, string> = {
  task_plan: "planId",
  task_context: "contextId",
  routing_decision: "routingId",
  task_verification_result: "verificationId",
  change_set: "changeSetId",
  task_handoff: "handoffId",
};
export function taskFailure(
  code: TaskErrorCode,
  message: string,
): { success: false; error: RepoSetupError } {
  return {
    success: false,
    error: createRepoSetupError({
      code,
      message,
      suggestion:
        "Review the version 1 task contracts and provide explicit valid references and authority.",
    }),
  };
}
export function parseTaskRecord<S extends z.ZodType>(
  schema: S,
  input: unknown,
  code: TaskErrorCode,
): TaskParseResult<z.infer<S>> {
  if (
    input !== null &&
    typeof input === "object" &&
    "schemaVersion" in input &&
    input.schemaVersion !== 1
  ) {
    return taskFailure("TASK_SCHEMA_VERSION_UNSUPPORTED", "Unsupported task document version.");
  }
  const parsed = schema.safeParse(input);
  return parsed.success
    ? { success: true, data: parsed.data }
    : taskFailure(code, "Task data does not match the strict version 1 boundary.");
}
export function parseTaskDocument(input: unknown): TaskParseResult<TaskDocument> {
  const kind =
    input !== null && typeof input === "object" && "kind" in input ? input.kind : undefined;
  const code =
    typeof kind === "string" && Object.hasOwn(codeByKind, kind)
      ? codeByKind[kind]!
      : "TASK_PLAN_INVALID";
  const result = parseTaskRecord(taskDocumentSchema, input, code);
  if (!result.success) return result;
  const field = identityByKind[result.data.kind];
  if (field !== undefined) {
    const record = result.data as unknown as Record<string, unknown>;
    const { [field]: identity, ...payload } = record;
    if (identity !== taskContentHash(payload)) {
      return taskFailure(code, "Task document identity does not match its canonical payload.");
    }
  }
  return result;
}

/** No I/O. Decode and reject duplicate (including escaped) keys before schema validation. */
export function parseTaskJson(input: string | Uint8Array): TaskParseResult<TaskDocument> {
  try {
    if (
      (typeof input === "string" ? Buffer.byteLength(input, "utf8") : input.byteLength) >
      TASK_DOCUMENT_LIMITS.bytes
    )
      return taskFailure("TASK_PLAN_INVALID", "Task document exceeds its byte limit.");
    const text =
      typeof input === "string" ? input : new TextDecoder("utf-8", { fatal: true }).decode(input);
    if (!isWellFormedTaskString(text)) throw new Error("unicode");
    checkJsonStructure(text);
    return parseTaskDocument(JSON.parse(text) as unknown);
  } catch {
    return taskFailure(
      "TASK_PLAN_INVALID",
      "Task JSON is malformed, too deeply nested, or contains duplicate keys.",
    );
  }
}
function checkJsonStructure(text: string): void {
  let position = 0;
  const whitespace = () => {
    while (/[ \n\r\t]/.test(text[position] ?? "x")) position++;
  };
  const quoted = (): string => {
    const start = position++;
    while (position < text.length) {
      const char = text[position++];
      if (char === "\\") position++;
      else if (char === '"') return JSON.parse(text.slice(start, position)) as string;
    }
    throw new Error("string");
  };
  const value = (depth: number): void => {
    if (depth > TASK_DOCUMENT_LIMITS.depth) throw new Error("depth");
    whitespace();
    const first = text[position];
    if (first === '"') {
      quoted();
      return;
    }
    if (first === "{" || first === "[") {
      position++;
      whitespace();
      const closing = first === "{" ? "}" : "]";
      const keys = new Set<string>();
      if (text[position] !== closing) {
        while (true) {
          whitespace();
          if (first === "{") {
            if (text[position] !== '"') throw new Error("key");
            const key = quoted();
            if (keys.has(key)) throw new Error("duplicate");
            keys.add(key);
            whitespace();
            if (text[position++] !== ":") throw new Error("colon");
          }
          value(depth + 1);
          whitespace();
          if (text[position] !== ",") break;
          position++;
        }
      }
      if (text[position++] !== closing) throw new Error("closing");
    } else {
      const start = position;
      while (position < text.length && !/[ \n\r\t,}\]]/.test(text[position]!)) position++;
      if (position === start) throw new Error("value");
    }
  };
  value(0);
  whitespace();
  if (position !== text.length) throw new Error("trailing");
}
