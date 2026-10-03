import type { InstallationOperation } from "../operations/types.js";
import { appendEnvLines, existingEnvKeys, formatEnvLine } from "../executor/env-example.js";
import { mergeJsonObjects, stringifyJson } from "../executor/json.js";

export type PreviewSnapshot =
  | { kind: "missing" }
  | { kind: "directory" }
  | { kind: "file"; content?: string }
  | { kind: "blocked"; reason: string };

export interface PreviewChange {
  category: "create" | "modify" | "preserve" | "blocked" | "unknown";
  target: string;
  before: string;
  after: string;
  reason: string;
  operation: InstallationOperation["type"];
}

export interface ChangePreview {
  version: 1;
  changes: PreviewChange[];
  blocked: boolean;
}

/** Pure, content-safe projection: no source or generated file contents enter the result. */
export function previewOperations(
  operations: readonly InstallationOperation[],
  snapshots: Readonly<Record<string, PreviewSnapshot>>,
): ChangePreview {
  const changes: PreviewChange[] = [];
  const state = new Map<string, PreviewSnapshot>(Object.entries(snapshots));
  const externalCwds: string[] = [];
  const record = (
    operation: InstallationOperation,
    target: string,
    category: PreviewChange["category"],
    reason: string,
  ) => {
    const snapshot = "path" in operation ? state.get(operation.path) : undefined;
    const external =
      "path" in operation &&
      externalCwds.some(
        (cwd) => cwd === "." || operation.path === cwd || operation.path.startsWith(`${cwd}/`),
      );
    const shownCategory = external && category !== "blocked" ? "unknown" : category;
    changes.push({
      category: shownCategory,
      target,
      before:
        snapshot === undefined
          ? "external state unknown"
          : snapshot.kind === "missing"
            ? "absent"
            : snapshot.kind === "file"
              ? "existing file"
              : snapshot.kind === "directory"
                ? "existing directory"
                : "unsafe path",
      after:
        shownCategory === "unknown"
          ? "unknown until execution"
          : shownCategory === "blocked"
            ? "unchanged; blocked"
            : shownCategory === "preserve"
              ? "unchanged"
              : operation.type === "create_directory"
                ? "new directory"
                : operation.type === "modify_json"
                  ? `JSON keys updated: ${Object.keys(operation.merge).join(", ")}`
                  : operation.type === "modify_text"
                    ? "one text replacement"
                    : operation.type === "add_env_example"
                      ? "placeholder keys added"
                      : "new or updated file",
      reason: `${operation.description} ${external && category !== "blocked" ? "An earlier external tool may change this path; exact result is unknown. " : ""}${reason}`,
      operation: operation.type,
    });
  };
  for (const operation of operations) {
    if (!("path" in operation)) {
      if (operation.type === "install_package") {
        record(
          operation,
          operation.cwd,
          "unknown",
          `${operation.packageManager} may change dependency manifests, lockfiles and installed packages; requested: ${operation.packages.join(", ")}.`,
        );
        externalCwds.push(operation.cwd);
      } else if (operation.type === "run_command") {
        record(
          operation,
          operation.cwd,
          "unknown",
          "Generator or command file effects are unknown until execution.",
        );
        externalCwds.push(operation.cwd);
      }
      continue;
    }
    const current = state.get(operation.path) ?? { kind: "missing" };
    if (current.kind === "blocked") {
      record(operation, operation.path, "blocked", current.reason);
      continue;
    }
    if (operation.type === "create_directory") {
      const category =
        current.kind === "missing"
          ? "create"
          : current.kind === "directory" && operation.behavior === "create_if_missing"
            ? "preserve"
            : "blocked";
      record(
        operation,
        operation.path,
        category,
        category === "blocked"
          ? "Target already exists or is not a directory."
          : "Directory operation.",
      );
      if (category === "create") state.set(operation.path, { kind: "directory" });
    } else if (operation.type === "create_file") {
      const category =
        current.kind === "missing"
          ? "create"
          : operation.behavior === "create_if_missing"
            ? "preserve"
            : operation.behavior === "overwrite" && current.kind === "file"
              ? "modify"
              : "blocked";
      record(
        operation,
        operation.path,
        category,
        category === "blocked"
          ? "Existing target conflicts with file creation."
          : category === "preserve"
            ? "Existing file is retained."
            : "RepoSetup supplies deterministic file content; contents suppressed.",
      );
      if (category === "create" || category === "modify")
        state.set(operation.path, { kind: "file", content: operation.content });
    } else if (operation.type === "modify_json" || operation.type === "modify_text") {
      const content = current.kind === "file" ? current.content : undefined;
      let valid = content !== undefined;
      let nextContent: string | undefined;
      if (valid && operation.type === "modify_json") {
        try {
          const value: unknown = JSON.parse(content ?? "");
          valid = typeof value === "object" && value !== null && !Array.isArray(value);
          if (valid)
            nextContent = stringifyJson(
              mergeJsonObjects(value as Record<string, unknown>, operation.merge),
            );
        } catch {
          valid = false;
        }
      }
      if (valid && operation.type === "modify_text") {
        const text = content ?? "";
        const crlf = operation.oldText.replaceAll("\n", "\r\n");
        const matched = text.includes(operation.oldText) ? operation.oldText : crlf;
        valid = operation.oldText.length > 0 && text.split(matched).length === 2;
        if (valid) {
          const replacement =
            matched === crlf ? operation.newText.replaceAll("\n", "\r\n") : operation.newText;
          nextContent = text.replace(matched, replacement);
        }
      }
      const category = valid ? "modify" : current.kind === "missing" ? "unknown" : "blocked";
      record(
        operation,
        operation.path,
        category,
        category === "modify"
          ? "Existing file will be changed; contents suppressed."
          : category === "unknown"
            ? "File may be generated by an earlier command; exact change unknown."
            : "Existing file is incompatible with the planned change or cannot be safely inspected.",
      );
      if (category === "modify")
        state.set(operation.path, {
          kind: "file",
          ...(nextContent === undefined ? {} : { content: nextContent }),
        });
    } else if (operation.type === "add_env_example") {
      const present =
        current.kind === "file" && current.content !== undefined
          ? existingEnvKeys(current.content)
          : new Set<string>();
      const missing = operation.entries.filter((entry) => !present.has(entry.key));
      const category =
        current.kind === "missing"
          ? "create"
          : current.kind === "file" && current.content !== undefined
            ? missing.length === 0
              ? "preserve"
              : "modify"
            : "blocked";
      record(
        operation,
        operation.path,
        category,
        category === "blocked"
          ? "Existing environment example cannot be safely inspected."
          : category === "preserve"
            ? "All placeholder keys already exist."
            : `Placeholder keys: ${missing.map((entry) => entry.key).join(", ")}; values suppressed.`,
      );
      if (category === "create" || category === "modify") {
        const prior = current.kind === "file" ? (current.content ?? "") : "";
        state.set(operation.path, {
          kind: "file",
          content: appendEnvLines(
            prior,
            missing.map((entry) => formatEnvLine(entry.key, entry.placeholder)),
          ),
        });
      }
    }
  }
  return { version: 1, changes, blocked: changes.some((change) => change.category === "blocked") };
}
