import type {
  AddPackagesRequest,
  InstallProjectRequest,
  PackageManagerAdapter,
  RemovePackagesRequest,
} from "./types.js";
import { createPackageManagerCommand } from "./command.js";
import { validateCwd, validatePackageSpecs } from "./validate.js";

/**
 * uv CLI commands verified from:
 * https://docs.astral.sh/uv/reference/cli/#uv-add
 * https://docs.astral.sh/uv/reference/cli/#uv-sync
 * https://docs.astral.sh/uv/reference/cli/#uv-remove
 * https://docs.astral.sh/uv/concepts/projects/dependencies/
 *
 * - add: `uv add [OPTIONS] <PACKAGES|--requirements <REQUIREMENTS>>`
 * - add (dev): `--dev` (alias for `--group dev`)
 * - install project: `uv sync [OPTIONS]`
 * - remove: `uv remove [OPTIONS] <PACKAGES>...` (no `--dev`; names work for any dependency group)
 */
export const uvAdapter: PackageManagerAdapter = {
  id: "uv",
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

    const args = request.dev === true ? ["add", "--dev"] : ["add"];

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "uv",
        args: [...args, ...request.packages],
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

    return {
      ok: true,
      operation: createPackageManagerCommand({
        command: "uv",
        args: ["sync"],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },

  remove(request: RemovePackagesRequest) {
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
        command: "uv",
        args: ["remove", ...request.packages],
        cwd: request.cwd,
        description: request.description,
      }),
    };
  },
};
