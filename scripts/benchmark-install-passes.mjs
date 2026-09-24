import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import process from "node:process";

const profiles = [
  {
    id: "react-toolchain",
    groups: [
      { dev: true, packages: ["vite@8.3.0", "@vitejs/plugin-react@6.1.1"] },
      { dev: true, packages: ["tailwindcss@4.3.3", "@tailwindcss/vite@4.3.3"] },
      { dev: true, packages: ["vitest@5.0.1", "jsdom@28.1.0"] },
      { dev: true, packages: ["prettier@3.9.8", "typescript@5.9.3"] },
      { dev: false, packages: ["zod@4.6.5"] },
    ],
  },
  {
    id: "express-toolchain",
    groups: [
      { dev: false, packages: ["express@5.2.1"] },
      { dev: true, packages: ["typescript@5.9.3", "@types/node@22.20.4"] },
      { dev: true, packages: ["@types/express@5.0.6", "vitest@5.0.1"] },
      { dev: true, packages: ["prettier@3.9.8", "tsx@4.23.15"] },
      { dev: false, packages: ["zod@4.6.5"] },
    ],
  },
];
const trials = Number(process.env.REPOSETUP_INSTALL_PASS_TRIALS ?? 5);
const outputPath = process.env.REPOSETUP_INSTALL_PASS_OUTPUT ?? "benchmark-install-passes.json";
if (process.env.REPOSETUP_ALLOW_REAL_INSTALL_BENCHMARK !== "1")
  throw new Error("Set REPOSETUP_ALLOW_REAL_INSTALL_BENCHMARK=1 to run real package installs.");
if (!Number.isInteger(trials) || trials < 1)
  throw new Error("REPOSETUP_INSTALL_PASS_TRIALS must be a positive integer");
const root = await mkdtemp(
  join(process.env.TMPDIR ?? process.env.TEMP ?? "/tmp", "reposetup-install-passes-"),
);
const rows = [];
try {
  for (const profile of profiles)
    for (const cacheMode of ["cold", "warm"])
      for (const strategy of ["phase19-separate-adds", "phase23-consolidated-install"]) {
        const cache = join(root, "cache", profile.id, cacheMode);
        const measurements = [];
        for (let trial = 1; trial <= trials; trial++) {
          if (cacheMode === "cold") await rm(cache, { recursive: true, force: true });
          await mkdir(cache, { recursive: true });
          const project = await mkdtemp(join(root, `${profile.id}-${strategy}-`));
          await writeFile(
            join(project, "package.json"),
            JSON.stringify({ name: "benchmark-owned", private: true, version: "0.0.0" }) + "\n",
          );
          await writeFile(join(project, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");
          const started = process.hrtime.bigint();
          let result;
          if (strategy === "phase19-separate-adds") {
            result = { status: 0, stderr: "" };
            for (const group of profile.groups) {
              const args = ["add", ...(group.dev ? ["--save-dev"] : []), ...group.packages];
              const r = runPnpm(args, {
                cwd: project,
                encoding: "utf8",
                env: env(cache),
                timeout: 30 * 60_000,
              });
              if (r.status !== 0) {
                result = r;
                break;
              }
            }
          } else {
            const manifest = {
              name: "benchmark-owned",
              private: true,
              version: "0.0.0",
              dependencies: {},
              devDependencies: {},
            };
            for (const group of profile.groups)
              for (const spec of group.packages) {
                const at = spec.lastIndexOf("@");
                const name = spec.slice(0, at);
                const version = spec.slice(at + 1);
                (group.dev ? manifest.devDependencies : manifest.dependencies)[name] = version;
              }
            await writeFile(
              join(project, "package.json"),
              JSON.stringify(manifest, null, 2) + "\n",
            );
            result = runPnpm(["install", "--no-frozen-lockfile", "--prefer-offline"], {
              cwd: project,
              encoding: "utf8",
              env: env(cache),
              timeout: 30 * 60_000,
            });
          }
          measurements.push({
            trial,
            elapsedMs: Number(process.hrtime.bigint() - started) / 1e6,
            exitCode: result.status ?? 1,
            stderr: (result.stderr ?? result.error?.message ?? "").slice(-2000),
          });
          await rm(project, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        }
        const values = measurements
          .filter((x) => x.exitCode === 0)
          .map((x) => x.elapsedMs)
          .sort((a, b) => a - b);
        rows.push({
          profile: profile.id,
          cacheMode,
          strategy,
          installSubprocesses: strategy === "phase19-separate-adds" ? profile.groups.length : 1,
          measurements,
          successfulMedianMs: values.length ? values[Math.floor(values.length / 2)] : null,
        });
      }
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
const report = {
  generatedAt: new Date().toISOString(),
  mode: "controlled-fixed-package-install-passes",
  environment: {
    platform: platform(),
    architecture: arch(),
    osRelease: release(),
    node: process.version,
  },
  trials,
  rows,
};
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n");
log(JSON.stringify(report, null, 2));
if (rows.some((row) => row.measurements.some((x) => x.exitCode !== 0))) process.exitCode = 1;
function env(cache) {
  return {
    ...process.env,
    CI: "false",
    npm_config_cache: join(cache, "npm"),
    pnpm_config_store_dir: join(cache, "pnpm-store"),
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
  };
}

function runPnpm(args, options) {
  if (process.platform !== "win32") return spawnSync("pnpm", args, options);
  return spawnSync(
    process.env.ComSpec ?? "cmd.exe",
    ["/d", "/v:off", "/c", "pnpm", ...args],
    options,
  );
}
