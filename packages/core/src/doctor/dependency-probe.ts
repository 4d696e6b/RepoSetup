import * as z from "zod";

import type { PackageManager, RuntimeId } from "../config/types.js";
import type { VerifyOperation } from "../operations/types.js";
import type { ProjectRelativePath } from "../paths/project-path.js";

/** Metadata only: never import application/dependency code or install packages. */
export const NODE_DEPENDENCY_PROBE = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const names = [...new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})])];
const missing = [], checked = [], errors = [];
for (const name of names) {
  if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name)) { errors.push('Invalid dependency name'); continue; }
  let directory = root, found = false;
  while (true) {
    try {
      const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'node_modules', name, 'package.json'), 'utf8'));
      found = typeof metadata.version === 'string';
      if (found) break;
    } catch {}
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  (found ? checked : missing).push(name);
}
console.log(JSON.stringify({ missing, checked, errors, environment: root }));
process.exitCode = missing.length || errors.length ? 1 : 0;
`;

/** Python >=3.12 provides tomllib and importlib.metadata. Generated requirements are pinned. */
export const PYTHON_DEPENDENCY_PROBE = String.raw`
import importlib.metadata as metadata
import json
import pathlib
import re
import sys
import tomllib

specs, errors, missing, checked = [], [], [], []
root = pathlib.Path.cwd()
pyproject = root / "pyproject.toml"
requirements = root / "requirements.txt"
if pyproject.is_file():
    data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
    specs.extend(data.get("project", {}).get("dependencies", []))
    groups = data.get("dependency-groups", {})
    def group(name, visiting):
        if name in visiting:
            errors.append("Dependency group cycle")
            return
        for spec in groups.get(name, []):
            if isinstance(spec, str):
                specs.append(spec)
            elif isinstance(spec, dict) and "include-group" in spec:
                group(spec["include-group"], visiting | {name})
    group("dev", set())
if requirements.is_file():
    specs.extend(line.strip() for line in requirements.read_text(encoding="utf-8").splitlines()
                 if line.strip() and not line.lstrip().startswith("#"))
if not pyproject.is_file() and not requirements.is_file():
    errors.append("No Python dependency manifest found")
for spec in specs:
    # Do not guess conditional requirements or execute URLs/options/includes.
    match = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[([^\]]+)\])?\s*(?:[<>=!~].*)?$", spec)
    if match is None or ";" in spec:
        errors.append("Unsupported requirement; inspect the manifest manually")
        continue
    names = [match.group(1)]
    # The generated FastAPI command requires standard extras, not just the distribution.
    if names[0].lower() == "fastapi" and "standard" in (match.group(2) or "").split(","):
        names.extend(["fastapi-cli", "uvicorn"])
    if names[0].lower() == "psycopg" and "binary" in (match.group(2) or "").split(","):
        names.append("psycopg-binary")
    for name in names:
        if name in checked or name in missing:
            continue
        try:
            metadata.version(name)
            checked.append(name)
        except metadata.PackageNotFoundError:
            missing.append(name)
print(json.dumps({"missing": missing, "checked": checked, "errors": errors, "environment": sys.executable}))
sys.exit(1 if missing or errors else 0)
`;

export const dependencyProbeResultSchema = z.strictObject({
  missing: z.array(z.string()),
  checked: z.array(z.string()),
  errors: z.array(z.string()),
  environment: z.string(),
});

export function dependencyVerificationOperation(
  runtime: RuntimeId,
  manager: PackageManager,
  cwd: ProjectRelativePath,
): VerifyOperation {
  const pythonArgs = ["-I", "-B", "-c", PYTHON_DEPENDENCY_PROBE];
  return {
    type: "verify",
    cwd,
    description: "Verify declared dependencies are installed before reporting creation complete",
    command: runtime === "node" ? "node" : manager === "uv" ? "uv" : "python",
    args:
      runtime === "node"
        ? ["-e", NODE_DEPENDENCY_PROBE]
        : manager === "uv"
          ? ["run", "--no-sync", "--offline", "--no-python-downloads", "python", ...pythonArgs]
          : pythonArgs,
  };
}
