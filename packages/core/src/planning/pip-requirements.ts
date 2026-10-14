import type { InstallationOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

/** Create owns a new manifest; add/remove must preserve existing requirement files. */
export function createPipRequirements(
  operations: readonly InstallationOperation[],
  cwd: ProjectRelativePath,
): InstallationOperation | undefined {
  const packages = new Set(
    operations.flatMap((operation) =>
      operation.type === "install_package" && operation.packageManager === "pip"
        ? operation.packages
        : [],
    ),
  );
  if (packages.size === 0) return undefined;
  return {
    type: "create_file",
    path: cwd === "." ? "requirements.txt" : `${cwd.replaceAll("\\", "/")}/requirements.txt`,
    content: `${[...packages].sort().join("\n")}\n`,
    behavior: "fail_if_exists",
    description: "Record all selected pip dependencies for detection and repeatable installation",
  };
}
