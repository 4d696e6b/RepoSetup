import type { RepoSetupConfig } from "../config/types.js";
import type { DetectionFileSystem } from "../integrations/definition.js";
import type { CreateFileOperation } from "../operations/types.js";
import { planInstallationSubset } from "../planning/plan.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { DoctorResult } from "./run-doctor.js";

export interface DoctorRepairPlan {
  operations: CreateFileOperation[];
  manual: string[];
}

/** Only reconstruct absent, known recipe files. Existing files are always user-owned. */
export async function planDoctorRepair(input: {
  config: RepoSetupConfig;
  doctor: DoctorResult;
  files: DetectionFileSystem;
  registry: RegistryLookup;
}): Promise<DoctorRepairPlan> {
  const { config, doctor, files, registry } = input;
  const operations: CreateFileOperation[] = [];
  const manual: string[] = [];
  const selected = new Set(config.integrations.map((item) => item.id));
  const failures = doctor.checks.filter((check) => !check.ok);
  const incompatible = failures.filter(
    (check) =>
      check.id !== "environment-example" &&
      check.id !== "intended:prettier" &&
      check.id !== "intended:prisma" &&
      check.id !== "intended:pydantic-settings",
  );
  const changedPin = doctor.checks.some((check) => check.id.startsWith("intended-version:"));
  if (incompatible.length > 0 || changedPin) {
    manual.push(
      "Resolve the other failing checks and any recipe version differences before repairing files. No automatic repair is safe for this project yet.",
    );
    return { operations, manual };
  }

  if (selected.has("prettier")) {
    const definition = registry.get("prettier");
    const qualified =
      config.runtime.id === "node" &&
      (config.framework.id === "react-vite" || config.framework.id === "express") &&
      definition?.verification?.verifiedAt !== undefined;
    if (!qualified) {
      manual.push(
        "Prettier config repair is qualified only for the known React/Vite and Express recipes.",
      );
    } else if (failures.some((check) => check.id === "intended:prettier")) {
      const planned = planInstallationSubset(config, registry, ["prettier"]);
      const template = planned.valid
        ? planned.operations.find(
            (operation) => operation.type === "create_file" && operation.path === ".prettierrc",
          )
        : undefined;
      if (template?.type === "create_file" && !(await files.exists(".prettierrc"))) {
        operations.push({
          ...template,
          behavior: "fail_if_exists",
          description: "Restore the missing recipe Prettier config",
        });
      } else {
        manual.push(
          "Inspect the Prettier configuration manually; an existing file cannot be replaced by doctor.",
        );
      }
    }
  }

  if (!(await files.exists(".env.example"))) {
    const entries = new Map<string, string>();
    let unsafe = false;
    for (const id of ["prisma", "pydantic-settings"] as const) {
      if (!selected.has(id)) continue;
      const definition = registry.get(id);
      const planned = planInstallationSubset(config, registry, [id]);
      const proofPath = id === "prisma" ? "lib/prisma.ts" : "settings.py";
      const proof = planned.valid
        ? planned.operations.find(
            (operation) => operation.type === "create_file" && operation.path === proofPath,
          )
        : undefined;
      const qualified =
        definition?.verification?.verifiedAt !== undefined &&
        proof?.type === "create_file" &&
        (await files.readText(proofPath)) === proof.content &&
        ((id === "prisma" &&
          config.runtime.id === "node" &&
          (await files.exists("prisma/schema.prisma")) &&
          ((await files.exists("generated/prisma/client.ts")) ||
            (await files.exists("generated/prisma/index.ts")))) ||
          (id === "pydantic-settings" &&
            config.framework.id === "fastapi" &&
            (await files.exists("settings.py"))));
      if (!qualified) {
        unsafe = true;
        manual.push(
          `The ${id} recipe cannot be identified confidently; create .env.example placeholders manually.`,
        );
        continue;
      }
      if (!planned.valid) {
        unsafe = true;
        continue;
      }
      for (const operation of planned.operations) {
        if (operation.type !== "add_env_example" || operation.path !== ".env.example") continue;
        for (const entry of operation.entries) {
          const previous = entries.get(entry.key);
          if (previous !== undefined && previous !== entry.placeholder) unsafe = true;
          entries.set(entry.key, entry.placeholder);
        }
      }
    }
    for (const selection of config.integrations) {
      if (selection.id === "prisma" || selection.id === "pydantic-settings") continue;
      const other = planInstallationSubset(config, registry, [selection.id]);
      if (!other.valid) continue;
      for (const operation of other.operations) {
        if (operation.type !== "add_env_example" || operation.path !== ".env.example") continue;
        for (const entry of operation.entries) {
          if (entries.get(entry.key) !== entry.placeholder) unsafe = true;
        }
      }
    }
    if (unsafe) {
      manual.push("Conflicting or unverified placeholder templates require manual review.");
    } else if (entries.size > 0) {
      operations.push({
        type: "create_file",
        path: ".env.example",
        content: [...entries]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => `${key}=${value}\n`)
          .join(""),
        behavior: "fail_if_exists",
        description: "Restore only declared recipe placeholder keys",
      });
    }
  }
  if (operations.length === 0 && failures.length > 0 && manual.length === 0)
    manual.push(
      "These findings are outside the file-only repair allowlist; follow their manual guidance.",
    );
  return { operations, manual };
}
