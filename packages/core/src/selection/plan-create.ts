import { parseSelection } from "./format.js";
import type { RepoSetupConfig } from "../config/types.js";
import type { InstallationOperation } from "../operations/types.js";
import { planInstallation } from "../planning/plan.js";
import type { RegistryLookup } from "../resolution/registry-lookup.js";
import type { ResolutionResult } from "../resolution/types.js";

/** Plan recipes in one new directory; all file and process targets share that root. */
export function planSelectionCreate(
  config: RepoSetupConfig,
  registry: RegistryLookup,
): ResolutionResult {
  const checked = parseSelection({
    selectionVersion: 1,
    cliContract: "selection-v1",
    catalogRevision: "local",
    mode: "create",
    config,
  });
  if (!checked.ok)
    return {
      valid: false,
      config,
      orderedIntegrations: [],
      operations: [],
      warnings: [],
      errors: [checked.error],
    };
  const directory = config.project.path ?? config.project.name;
  const local = planInstallation(
    { ...config, project: { name: config.project.name, path: "." } },
    registry,
  );
  if (!local.valid) return { ...local, config };
  const scope = (relative: string) => (relative === "." ? directory : `${directory}/${relative}`);
  const operations: InstallationOperation[] = [
    {
      type: "create_directory",
      path: directory,
      behavior: "fail_if_exists",
      description: `Reserve new project directory ${directory}; refuse an existing target`,
    },
    ...local.operations.map((operation) => {
      if ("path" in operation) return { ...operation, path: scope(operation.path) };
      if ("cwd" in operation) return { ...operation, cwd: scope(operation.cwd) };
      return operation;
    }),
  ];
  return {
    ...local,
    config: { ...config, project: { ...config.project, path: directory } },
    operations,
  };
}
