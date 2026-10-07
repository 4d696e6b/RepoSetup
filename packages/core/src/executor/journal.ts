import { createHash } from "node:crypto";

import type { InstallationOperation } from "../operations/types.js";
import type { ExecutionJournalEntry } from "./types.js";

export function journalEntryForOperation(input: {
  operation: InstallationOperation;
  index: number;
  status: ExecutionJournalEntry["status"];
  durationMs?: number;
  errorCode?: ExecutionJournalEntry["errorCode"];
}): ExecutionJournalEntry {
  return {
    operationId: operationId(input.operation, input.index),
    index: input.index,
    operationType: input.operation.type,
    status: input.status,
    ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
    ...(input.errorCode === undefined ? {} : { errorCode: input.errorCode }),
  };
}

function operationId(operation: InstallationOperation, index: number): string {
  return createHash("sha256")
    .update(JSON.stringify({ index, type: operation.type, target: operationTarget(operation) }))
    .digest("hex");
}

function operationTarget(operation: InstallationOperation): string | undefined {
  switch (operation.type) {
    case "check_prerequisite":
      return operation.id;
    case "install_package":
    case "run_command":
    case "verify":
      return operation.cwd;
    case "create_directory":
    case "create_file":
    case "modify_json":
    case "modify_text":
    case "add_env_example":
      return operation.path;
    case "show_message":
      return undefined;
    default: {
      const exhaustive: never = operation;
      return exhaustive;
    }
  }
}
