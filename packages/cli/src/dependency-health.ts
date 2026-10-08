import path from "node:path";

import {
  NODE_DEPENDENCY_PROBE,
  PYTHON_DEPENDENCY_PROBE,
  dependencyProbeResultSchema,
  type DoctorCheck,
  type VerificationContext,
} from "@reposetup/core";

import type { ResolvedCliDeps } from "./types.js";

type DependencyHealthDeps = Pick<
  ResolvedCliDeps,
  "runProcess" | "resolveExecutable" | "commandExists"
>;

/** Uses the executor's process adapter, with no package-manager resolution or syncing. */
export function createDependencyHealthCheck(deps: DependencyHealthDeps) {
  return async (context: VerificationContext): Promise<DoctorCheck[]> => {
    const checks: DoctorCheck[] = [];
    if (context.packageJson === undefined && (await context.files.exists("package.json"))) {
      checks.push({
        id: "dependencies:node",
        name: "Node installed dependencies",
        ok: false,
        code: "VERIFICATION_FAILED",
        message: "Cannot inspect dependencies: package.json is invalid.",
        suggestion: "Repair package.json, then rerun doctor.",
      });
    }
    if (context.packageJson !== undefined && (await deps.commandExists("node"))) {
      checks.push(
        await probe(deps, context.projectRoot, "node", ["-e", NODE_DEPENDENCY_PROBE], "node"),
      );
    }
    if (
      (await context.files.exists("pyproject.toml")) ||
      (await context.files.exists("requirements.txt"))
    ) {
      const isUv = await context.files.exists("uv.lock");
      const projectEnvironment = isUv
        ? path.resolve(context.projectRoot, process.env.UV_PROJECT_ENVIRONMENT ?? ".venv")
        : undefined;
      // uv owns its project environment; an unrelated activated environment must not mask damage.
      const python =
        projectEnvironment === undefined
          ? await deps.resolveExecutable("python")
          : path.join(
              projectEnvironment,
              process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
            );
      checks.push(
        await probe(
          deps,
          context.projectRoot,
          python,
          ["-I", "-B", "-c", PYTHON_DEPENDENCY_PROBE],
          "python",
          isUv,
        ),
      );
    }
    return checks;
  };
}

async function probe(
  deps: DependencyHealthDeps,
  cwd: string,
  command: string | undefined,
  args: string[],
  runtime: "node" | "python",
  isUv = false,
): Promise<DoctorCheck> {
  const base = {
    id: `dependencies:${runtime}`,
    name: `${runtime === "node" ? "Node" : "Python"} installed dependencies`,
  };
  const suggestion =
    runtime === "node"
      ? "Run npm install or pnpm install with the project's selected manager, then rerun doctor."
      : isUv
        ? "Run uv sync in this project, then use uv run fastapi dev (or uv run flask run). Doctor does not repair the environment."
        : "Activate the Python environment used to create this project and run python -m pip install -r requirements.txt, then rerun doctor.";
  if (command === undefined)
    return {
      ...base,
      ok: false,
      code: "VERIFICATION_FAILED",
      message: "Cannot inspect the Python environment: no interpreter was found.",
      suggestion,
    };
  const result = await deps.runProcess({ command, args, cwd, timeoutMs: 30_000 });
  let parsed;
  try {
    parsed = dependencyProbeResultSchema.safeParse(JSON.parse(result.stdout));
  } catch {
    parsed = undefined;
  }
  if (
    parsed?.success !== true ||
    result.notFound === true ||
    result.timedOut === true ||
    result.aborted === true
  ) {
    return {
      ...base,
      ok: false,
      code: "VERIFICATION_FAILED",
      message: `Cannot inspect ${runtime} dependencies in the selected project environment.`,
      suggestion,
    };
  }
  const data = parsed.data;
  const ok = result.exitCode === 0 && data.missing.length === 0 && data.errors.length === 0;
  return {
    ...base,
    ok,
    message: ok
      ? `Verified ${data.checked.length} installed dependencies in ${data.environment}.`
      : `${data.missing.length > 0 ? `Not installed: ${data.missing.join(", ")}. ` : ""}${data.errors.join(" ")} Environment: ${data.environment}.`,
    ...(ok ? {} : { code: "VERIFICATION_FAILED" as const, suggestion }),
  };
}
