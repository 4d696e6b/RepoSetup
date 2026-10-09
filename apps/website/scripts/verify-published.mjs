import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { URL, fileURLToPath } from "node:url";

const VERSION = "0.2.3";
const EXPECTED_SHA256 = "f740df147bc9e8dbf4dc076322f2424d96ad2f27a0da14ef3e46c818e26edd2b";
const EXPECTED_INTEGRITY =
  "sha512-Rhb6DravIbIe7A7/5dF5rD68ccJx9a5tDhZzWSbCpSxiVzKpY+ihz0x7XBBnQZNBLT3AncOcBmvv9zcADZ628A==";
const REGISTRY = "https://registry.npmjs.org";
const PRESET_IDS = ["next-sqlite", "react-vite", "express-postgres", "fastapi", "flask"];
const UNSHIPPED_FLAGS = ["--selection", "--selection-file", "--recipe"];
const root = fileURLToPath(new URL("../.published-cli/", import.meta.url));
const release = JSON.parse(
  await readFile(new URL("../src/generated/release.json", import.meta.url)),
);
const report = {
  schemaVersion: 1,
  version: VERSION,
  startedAt: new Date().toISOString(),
  status: "running",
  scope:
    "Isolated published npm package; read-only CLI commands, five preset previews and config previews. No project installation, global installation, upload or publication.",
  sourceRevision: release.source.revision,
  environment: { node: process.version, platform: process.platform, architecture: process.arch },
  checks: [],
};

function digest(bytes, algorithm = "sha256", encoding = "hex") {
  return createHash(algorithm).update(bytes).digest(encoding);
}

async function command(executable, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Command timed out: ${path.basename(executable)} ${args[0] ?? ""}`));
    }, 120_000);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

async function snapshot(directory) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const target = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), "Fixture directory must not contain symbolic links.");
    if (entry.isDirectory()) {
      files.push([`${entry.name}/`, await snapshot(target)]);
    } else {
      files.push([entry.name, digest(await readFile(target))]);
    }
  }
  return files;
}

async function fetchFromRegistry(url) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, REGISTRY, "Package downloads must use the official npm registry.");
  const response = await globalThis.fetch(url, {
    redirect: "error",
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  assert(response.ok, `npm registry returned HTTP ${response.status}.`);
  return response;
}

let runRoot;
try {
  assert(
    Number(process.versions.node.split(".")[0]) >= 24,
    "Published rsetup@0.2.3 requires Node.js 24 or newer.",
  );
  assert.equal(release.package.version, VERSION, "Website catalog must document only 0.2.3.");
  assert.deepEqual(
    release.presets.map(({ id }) => id),
    PRESET_IDS,
  );
  await mkdir(root, { recursive: true });
  assert(
    !(await lstat(root)).isSymbolicLink(),
    "Published CLI evidence directory must not be a symbolic link.",
  );
  runRoot = await mkdtemp(path.join(root, "run-"));
  const workspace = path.join(runRoot, "workspace");
  const install = path.join(runRoot, "install");
  await mkdir(workspace);
  await mkdir(install);

  const metadata = await (await fetchFromRegistry(`${REGISTRY}/rsetup/${VERSION}`)).json();
  assert.equal(metadata.name, "rsetup");
  assert.equal(metadata.version, VERSION);
  assert.equal(
    metadata.dist.integrity,
    EXPECTED_INTEGRITY,
    "Registry integrity differs from qualified delivery bytes.",
  );
  assert.equal(metadata.dist.tarball, `${REGISTRY}/rsetup/-/rsetup-${VERSION}.tgz`);
  const archive = Buffer.from(await (await fetchFromRegistry(metadata.dist.tarball)).arrayBuffer());
  assert.equal(
    digest(archive),
    EXPECTED_SHA256,
    "Published archive SHA-256 differs from release delivery.",
  );
  assert.equal(`sha512-${digest(archive, "sha512", "base64")}`, EXPECTED_INTEGRITY);
  const tarball = path.join(runRoot, `rsetup-${VERSION}.tgz`);
  await writeFile(tarball, archive);
  report.archive = {
    tarball: metadata.dist.tarball,
    bytes: archive.length,
    sha256: EXPECTED_SHA256,
    integrity: EXPECTED_INTEGRITY,
  };
  report.checks.push({ id: "published-integrity", status: "passed" });

  // A verified archive is installed into this ignored evidence folder only.
  // Lifecycle scripts are disabled; no global package or system dependency is installed.
  const installation = await command(
    "npm",
    [
      "install",
      "--prefix",
      install,
      "--cache",
      path.join(runRoot, "npm-cache"),
      "--registry",
      REGISTRY,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      tarball,
    ],
    runRoot,
  );
  assert.equal(installation.code, 0, `Isolated npm installation exited ${installation.code}.`);
  const packageRoot = path.join(install, "node_modules", "rsetup");
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  assert.equal(packageJson.version, VERSION);
  assert.deepEqual(Object.keys(packageJson.bin).sort(), ["reposetup", "rsetup"]);
  for (const target of Object.values(packageJson.bin))
    assert.equal(target.replace(/^\.\//, ""), "dist/bin.js");
  const bin = path.join(packageRoot, "dist", "bin.js");
  report.checks.push({ id: "isolated-install", status: "passed", lifecycleScripts: false });

  async function cli(id, args, expectedCode = 0, entrypoint = bin) {
    const before = await snapshot(workspace);
    const result = await command(process.execPath, [entrypoint, ...args], workspace);
    assert.equal(
      result.code,
      expectedCode,
      `${id}: expected exit ${expectedCode}, received ${result.code}.`,
    );
    assert.deepEqual(
      await snapshot(workspace),
      before,
      `${id}: read-only command changed fixture files.`,
    );
    report.checks.push({
      id,
      status: "passed",
      args,
      exitCode: result.code,
      outputSha256: digest(result.stdout + result.stderr),
      fixtureUnchanged: true,
    });
    return result;
  }

  for (const alias of ["rsetup", "reposetup"]) {
    const result = await cli(
      `version-${alias}`,
      ["--version"],
      0,
      path.join(install, "node_modules", ".bin", alias),
    );
    assert.equal(result.stdout.trim(), VERSION);
  }
  const help = await cli("root-help", ["--help"]);
  for (const flag of release.cli.globalFlags) assert(help.stdout.includes(flag.flags));
  for (const item of release.cli.commands) {
    const result = await cli(`help-${item.id}`, [...item.path, "--help"]);
    assert(
      result.stdout.includes(item.usage),
      `${item.id}: documented usage differs from published help.`,
    );
    for (const flag of item.flags)
      assert(
        result.stdout.includes(flag.flags),
        `${item.id}: flag is absent from published help: ${flag.flags}`,
      );
    for (const flag of UNSHIPPED_FLAGS)
      assert(!result.stdout.includes(flag), `${item.id}: unsupported flag leaked into help.`);
  }
  const presets = await cli("presets", ["presets"]);
  for (const id of PRESET_IDS) assert(presets.stdout.includes(id));
  const search = await cli("search", ["search", "vitest"]);
  assert(search.stdout.includes("vitest"));
  const info = await cli("info", ["info", "vitest"]);
  assert(info.stdout.includes("Vitest"));
  const registry = await cli("registry-validate", ["registry", "validate"]);
  assert(
    registry.stdout.includes("37"),
    "Published registry must contain the same 37 definitions.",
  );

  for (const preset of release.presets) {
    const args = ["create", "docs-demo", "--preset", preset.id, "--dry-run"];
    assert(!args.includes("--yes"));
    const result = await cli(`preset-preview-${preset.id}`, args);
    assert(result.stdout.startsWith("Dry-run for docs-demo"));
    assert(result.stdout.includes("No files or commands were executed."));
    const presetJson = await cli(`preset-destination-${preset.id}`, ["--json", ...args]);
    const presetPlan = JSON.parse(presetJson.stdout);
    assert.equal(presetPlan.kind, "plan");
    assert.equal(presetPlan.dryRun, true);
    assert.equal(presetPlan.plan.valid, true);
    assert.equal(
      presetPlan.plan.config.project.path ?? ".",
      ".",
      "Published preset name changes its name, not its current-directory destination.",
    );

    const config = globalThis.structuredClone(preset.config);
    config.project = { name: "docs-demo", path: "docs-demo" };
    const configName = "reposetup-docs-demo.json";
    await writeFile(path.join(workspace, configName), `${JSON.stringify(config, null, 2)}\n`);
    const fileResult = await cli(`config-preview-${preset.id}`, [
      "create",
      "--config",
      configName,
      "--dry-run",
    ]);
    assert(fileResult.stdout.startsWith("Dry-run for docs-demo"));
    assert(fileResult.stdout.includes("No files or commands were executed."));
    const configJson = await cli(`config-destination-${preset.id}`, [
      "--json",
      "create",
      "--config",
      configName,
      "--dry-run",
    ]);
    const configPlan = JSON.parse(configJson.stdout);
    assert.equal(configPlan.kind, "plan");
    assert.equal(configPlan.dryRun, true);
    assert.equal(configPlan.plan.valid, true);
    assert.equal(configPlan.plan.config.project.path, "docs-demo");
    assert.deepEqual(
      configPlan.plan.orderedIntegrations,
      presetPlan.plan.orderedIntegrations,
      `${preset.id}: config must retain the preset's exact selections.`,
    );
    assert(
      configPlan.plan.operations.some(
        (operation) => operation.path === "docs-demo" || operation.cwd === "docs-demo",
      ),
      `${preset.id}: explicit downloaded destination is absent from the plan.`,
    );
  }

  // Non-interactive execution must render the local plan then abort before mutation.
  const confirmation = await cli(
    "confirmation-required",
    ["create", "--config", "reposetup-docs-demo.json"],
    release.exitCodes.INVALID_INPUT,
  );
  assert(confirmation.stdout.startsWith("Plan for docs-demo"));
  assert(confirmation.stderr.includes("Aborted."));

  const unsafeConfig = globalThis.structuredClone(release.presets[0].config);
  unsafeConfig.project.name = "../unsafe";
  await writeFile(
    path.join(workspace, "unsafe.reposetup.json"),
    `${JSON.stringify(unsafeConfig)}\n`,
  );
  const invalid = await cli(
    "unsafe-config-name",
    ["create", "--config", "unsafe.reposetup.json", "--dry-run"],
    release.exitCodes.INVALID_INPUT,
  );
  assert(invalid.stderr.includes("PROJECT_NAME_INVALID"));
  const unknownPreset = await cli(
    "unknown-preset",
    ["create", "docs-demo", "--preset", "unknown-preset", "--dry-run"],
    release.exitCodes.INVALID_INPUT,
  );
  assert(unknownPreset.stderr.includes("Unknown preset"));
  for (const flag of UNSHIPPED_FLAGS) {
    const rejected = await cli(
      `reject-${flag.slice(2)}`,
      ["create", "docs-demo", "--preset", "react-vite", "--dry-run", flag, "unshipped"],
      release.exitCodes.INVALID_INPUT,
    );
    assert(rejected.stderr.includes("unknown option"));
  }

  report.status = "passed";
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(runRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(root, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `Published rsetup@${VERSION}: ${report.checks.length} checks passed; no project files changed.\nEvidence: ${path.join(root, "report.json")}\n`,
  );
} catch (error) {
  report.status = "failed";
  report.finishedAt = new Date().toISOString();
  report.failure = error instanceof Error ? error.message : "Published CLI verification failed.";
  if (runRoot !== undefined)
    await writeFile(path.join(runRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stderr.write(`${report.failure}\n`);
  process.exitCode = 1;
}
