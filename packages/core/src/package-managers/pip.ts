import { createRepoSetupError } from "../errors/model.js";
import { UNSAFE_REMOVE_MESSAGE } from "../errors/unsafe-remove.js";

import type { AddPackagesRequest, InstallProjectRequest, PackageManagerAdapter } from "./types.js";
import { createPackageManagerCommand } from "./command.js";
import { validateCwd, validatePackageSpecs, validateRequirementsFile } from "./validate.js";

/**
 * pip CLI commands verified from:
 * https://pip.pypa.io/en/stable/cli/pip_install/
 * https://pip.pypa.io/en/stable/cli/pip_uninstall/
 * https://docs.python.org/3/installing/index.html
 *
 * - add: `python -m pip install [options] <requirement specifier> ...`
 * - pip has no `--save-dev` / `--dev` flag; `dev: true` does not change argv
 * - install project: `python -m pip install -r <requirements file>`
 * - remove: refused. `pip uninstall` does not rewrite requirements.txt.
 */
export const pipAdapter: PackageManagerAdapter = {
  id: "pip",
  runtimeId: "python",

  add(request: AddPackagesRequest) {
    const cwdError = validateCwd(request.cwd);
    if (cwdError !== undefined) {
      return { ok: false, error: cwdError };
    }

    const specError = validatePackageSpecs(request.packages);
    if (specError !== undefined) {
      return { ok: false, error: specError };
    }

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "python",
        args: ["-m", "pip", "install", ...request.packages],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },

  install(request: InstallProjectRequest) {
    const cwdError = validateCwd(request.cwd);
    if (cwdError !== undefined) {
      return { ok: false, error: cwdError };
    }

    const requirements = validateRequirementsFile(request.requirementsFile);
    if (!requirements.ok) {
      return requirements;
    }

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "python",
        args: ["-m", "pip", "install", "-r", requirements.path],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },

  remove() {
    return {
      ok: false,
      error: createRepoSetupError({
        code: "UNSUPPORTED_CONTEXT",
        message: UNSAFE_REMOVE_MESSAGE,
        details: { packageManager: "pip" },
        suggestion:
          "pip uninstall does not update requirements.txt. Remove the dependency from the requirements file yourself.",
      }),
    };
  },
};
