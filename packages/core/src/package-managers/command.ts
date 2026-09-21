import type { RunCommandOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

export function createPackageManagerCommand(input: {
  command: string;
  args: string[];
  cwd: ProjectRelativePath;
  description: string;
}): RunCommandOperation {
  return {
    type: "run_command",
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    description: input.description,
    requiresNetwork: true,
  };
}
