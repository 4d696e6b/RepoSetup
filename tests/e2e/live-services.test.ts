import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it } from "vitest";

import { redactProcessOutput } from "../../packages/core/src/executor/output-snippet.js";
import {
  cleanupWorkspace,
  cliPackageVersion,
  createTempWorkspace,
  monorepoBin,
  repoRoot,
} from "./harness.js";

// This suite starts only its own disposable services. Missing prerequisites are
// failures when explicitly enabled, rather than successful metadata-only checks.
const enabled = process.env.REPOSETUP_LIVE_SERVICES === "1";
const postgresImage = "postgres:18.6";
// Official image tags: https://github.com/docker-library/official-images/blob/master/library/mongo
const mongoImage = "mongo:8.0.32";
const evidenceDirectory = process.env.REPOSETUP_LIVE_EVIDENCE_DIR;
const secrets = new Set<string>();
// Tests run sequentially. Keep cleanup outside the main work's deadline so
// Vitest's 25-minute case limit cannot interrupt an otherwise unbounded plan.
let workDeadline: number | undefined;
let cleanupDeadline: number | undefined;

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

interface ServiceEvidence {
  schemaVersion: number;
  sourceCommit: string | null;
  packageVersion: string;
  platform: string;
  architecture: string;
  node: string;
  scope: string;
  image: string;
  imageDigests?: string;
  serviceVersion?: string;
  checks: string[];
  status: "running" | "passed" | "failed";
  cleanup: boolean;
  diagnostics?: string;
  error?: string;
}

function redact(value: string, limit = 16_384): string {
  let result = redactProcessOutput(value);
  for (const secret of secrets) result = result.replaceAll(secret, "[REDACTED]");
  return result.slice(-limit);
}

function sanitizedFailure(error: unknown, message: string): Error {
  // Assertion errors may retain unredacted actual/expected values. Keep only
  // sanitized messages; do not attach the original error as a printable cause.
  const cause = new Error(redact(error instanceof Error ? error.message : String(error)));
  return new Error(message, { cause });
}

/** Bounded output and process lifetime, including children of a timed-out CLI. */
async function command(
  executable: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs = 60_000,
): Promise<CommandResult> {
  const deadline = workDeadline ?? cleanupDeadline;
  const remaining = deadline === undefined ? timeoutMs : deadline - Date.now();
  if (remaining <= 0) {
    throw new Error(
      `Live-service ${workDeadline === undefined ? "cleanup" : "main work"} deadline exceeded.`,
    );
  }
  const effectiveTimeout = Math.min(timeoutMs, remaining);
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    function stop(signal: NodeJS.Signals): void {
      if (child.pid === undefined) return;
      try {
        if (process.platform === "win32") child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch {
        // The owned process group may already have exited.
      }
    }
    const timer = setTimeout(() => {
      timedOut = true;
      stop("SIGTERM");
      forceKill = setTimeout(() => stop("SIGKILL"), 2_000);
    }, effectiveTimeout);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = (stdout + chunk.toString("utf8")).slice(-16_384);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-16_384);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      if (forceKill !== undefined) clearTimeout(forceKill);
      reject(new Error(redact(error.message)));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (forceKill !== undefined) clearTimeout(forceKill);
      resolve({ exitCode: code ?? 1, stdout, stderr, timedOut });
    });
  });
}

async function checked(
  executable: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs?: number,
): Promise<string> {
  const result = await command(executable, args, cwd, env, timeoutMs);
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(
      redact(
        `${path.basename(executable)} failed${result.timedOut ? " (timeout)" : ""}: ${result.stderr}\n${result.stdout}`,
      ),
    );
  }
  return result.stdout;
}

async function availablePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a loopback test port."));
        return;
      }
      server.close((error) => (error === undefined ? resolve(address.port) : reject(error)));
    });
  });
}

function evidence(scope: string, image: string): ServiceEvidence {
  return {
    schemaVersion: 1,
    sourceCommit: process.env.GITHUB_SHA ?? null,
    packageVersion: cliPackageVersion(),
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
    scope,
    image,
    checks: [],
    status: "running",
    cleanup: false,
  };
}

async function retain(record: ServiceEvidence): Promise<void> {
  if (evidenceDirectory === undefined) return;
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    path.join(evidenceDirectory, `${record.scope}.json`),
    `${redact(JSON.stringify(record, null, 2), Number.MAX_SAFE_INTEGER)}\n`,
  );
}

async function prerequisites(env: NodeJS.ProcessEnv): Promise<void> {
  if (process.platform === "win32")
    throw new Error("Live-service acceptance targets POSIX Docker hosts only.");
  await checked("docker", ["version", "--format", "{{.Server.Version}}"], repoRoot, env, 10_000);
  await checked("docker", ["compose", "version"], repoRoot, env, 10_000);
}

async function createProject(
  parent: string,
  name: string,
  integrations: readonly string[],
  env: NodeJS.ProcessEnv,
  python = false,
): Promise<string> {
  const config = {
    schemaVersion: 1,
    project: { name, path: name },
    runtime: { id: python ? "python" : "node" },
    packageManager: python ? "uv" : "npm",
    framework: python ? { id: "fastapi" } : { id: "express", options: { typescript: false } },
    integrations: integrations.map((id) => ({ id })),
  };
  const configPath = path.join(parent, `${name}.json`);
  await writeFile(configPath, JSON.stringify(config));
  await checked(
    process.execPath,
    [monorepoBin, "create", "--config", configPath, "--yes"],
    parent,
    env,
    600_000,
  );
  const cwd = path.join(parent, name);
  await checked(process.execPath, [monorepoBin, "doctor"], cwd, env);
  return cwd;
}

async function script(
  cwd: string,
  name: string,
  content: string,
  env: NodeJS.ProcessEnv,
  python = false,
): Promise<void> {
  const file = path.join(cwd, name);
  await writeFile(file, content, { flag: "wx" });
  await checked(
    python ? path.join(cwd, ".venv", "bin", "python") : process.execPath,
    [file],
    cwd,
    env,
  );
}

async function waitFor(check: () => Promise<CommandResult>, label: string): Promise<void> {
  const deadline = Math.min(Date.now() + 90_000, workDeadline ?? Number.MAX_SAFE_INTEGER);
  let last: CommandResult | undefined;
  while (Date.now() < deadline) {
    last = await check();
    if (last.exitCode === 0 && !last.timedOut) return;
    await delay(Math.min(1_000, Math.max(0, deadline - Date.now())));
  }
  throw new Error(redact(`${label} was not ready: ${last?.stderr ?? ""}\n${last?.stdout ?? ""}`));
}

describe.skipIf(!enabled)("live generated service acceptance", () => {
  it("queries PostgreSQL through generated Prisma, Drizzle and SQLAlchemy helpers and retains data across a Compose restart", async () => {
    workDeadline = Date.now() + 20 * 60_000;
    const parent = await createTempWorkspace("reposetup-live-postgres-");
    const project = `reposetup-live-${randomUUID()}`;
    const password = randomBytes(24).toString("hex");
    secrets.add(password);
    const port = await availablePort();
    const url = `postgresql://liveuser:${password}@127.0.0.1:${port}/livedb`;
    const env = {
      ...process.env,
      POSTGRES_USER: "liveuser",
      POSTGRES_PASSWORD: password,
      POSTGRES_DB: "livedb",
      POSTGRES_PORT: String(port),
      DATABASE_URL: url,
      npm_config_cache: path.join(parent, "npm-cache"),
      UV_CACHE_DIR: path.join(parent, "uv-cache"),
    };
    const record = evidence("postgresql-generated-helpers", postgresImage);
    let cwd: string | undefined;
    let started = false;
    let failure: unknown;
    const compose = (args: readonly string[]) => [
      "compose",
      "--project-name",
      project,
      "--file",
      path.join(cwd ?? parent, "compose.yaml"),
      ...args,
    ];
    try {
      await prerequisites(env);
      await checked("uv", ["--version"], parent, env, 10_000);
      cwd = await createProject(
        parent,
        "prisma-app",
        ["postgresql", "prisma", "docker", "docker-compose"],
        env,
      );
      const generated = await readFile(path.join(cwd, "compose.yaml"), "utf8");
      expect(generated).toContain(`image: ${postgresImage}`);
      expect(generated).toContain("127.0.0.1:");
      expect(generated).toContain("postgres_data:/var/lib/postgresql");
      expect(generated.includes(password)).toBe(false);
      const generatedEnv = await readFile(path.join(cwd, ".env"), "utf8").catch(() => "");
      expect(generatedEnv.includes(password)).toBe(false);
      record.checks.push(
        "CLI create and doctor; generated Compose image, loopback binding and PostgreSQL 18 persistent mount",
      );
      await checked("docker", compose(["config", "--quiet"]), cwd, env);
      started = true;
      await checked("docker", compose(["up", "--detach", "db"]), cwd, env, 300_000);
      await waitFor(
        () =>
          command(
            "docker",
            compose([
              "exec",
              "-T",
              "db",
              "pg_isready",
              "-h",
              "127.0.0.1",
              "-U",
              "liveuser",
              "-d",
              "livedb",
            ]),
            cwd!,
            env,
            10_000,
          ),
        "PostgreSQL",
      );
      expect((await checked("docker", compose(["port", "db", "5432"]), cwd, env)).trim()).toBe(
        `127.0.0.1:${port}`,
      );
      record.imageDigests = (
        await checked(
          "docker",
          ["image", "inspect", postgresImage, "--format", "{{json .RepoDigests}}"],
          cwd,
          env,
        )
      ).trim();
      record.serviceVersion = (
        await checked("docker", compose(["exec", "-T", "db", "postgres", "--version"]), cwd, env)
      ).trim();
      expect(record.serviceVersion).toContain("18.6");
      await script(
        cwd,
        "live-prisma.mjs",
        `import assert from 'node:assert/strict';\nimport { prisma } from './lib/prisma.js';\ntry {\n  await prisma.$executeRaw\`CREATE TABLE live_prisma (id integer PRIMARY KEY, name text NOT NULL)\`;\n  await prisma.$executeRaw\`INSERT INTO live_prisma VALUES (1, 'created')\`;\n  await prisma.$executeRaw\`UPDATE live_prisma SET name = 'updated' WHERE id = 1\`;\n  assert.equal((await prisma.$queryRaw\`SELECT name FROM live_prisma WHERE id = 1\`)[0].name, 'updated');\n} finally { await prisma.$disconnect(); }\n`,
        env,
      );
      record.checks.push("generated Prisma helper connects and creates, updates and reads data");
      await checked("docker", compose(["restart", "db"]), cwd, env);
      // Replacing the container also proves that data lives on the generated
      // named volume, rather than only in the first container's writable layer.
      await checked("docker", compose(["up", "--detach", "--force-recreate", "db"]), cwd, env);
      await waitFor(
        () =>
          command(
            "docker",
            compose([
              "exec",
              "-T",
              "db",
              "pg_isready",
              "-h",
              "127.0.0.1",
              "-U",
              "liveuser",
              "-d",
              "livedb",
            ]),
            cwd!,
            env,
            10_000,
          ),
        "restarted PostgreSQL",
      );
      await script(
        cwd,
        "live-prisma-persistence.mjs",
        `import assert from 'node:assert/strict';\nimport { prisma } from './lib/prisma.js';\ntry {\n  assert.equal((await prisma.$queryRaw\`SELECT name FROM live_prisma WHERE id = 1\`)[0].name, 'updated');\n  await prisma.$executeRaw\`DELETE FROM live_prisma WHERE id = 1\`;\n  assert.equal((await prisma.$queryRaw\`SELECT name FROM live_prisma\`).length, 0);\n} finally { await prisma.$disconnect(); }\n`,
        env,
      );
      record.checks.push(
        "Compose restart and container recreation preserve PostgreSQL data on the generated volume; Prisma deletes it afterward",
      );
      const drizzle = await createProject(parent, "drizzle-app", ["postgresql", "drizzle"], env);
      await script(
        drizzle,
        "live-drizzle.mjs",
        `import assert from 'node:assert/strict';\nimport { sql, eq } from 'drizzle-orm';\nimport { db } from './src/db/index.ts';\nimport { items } from './src/db/schema.ts';\ntry {\n  await db.execute(sql\`CREATE TABLE items (id serial PRIMARY KEY, name text NOT NULL)\`);\n  const [created] = await db.insert(items).values({ name: 'created' }).returning();\n  await db.update(items).set({ name: 'updated' }).where(eq(items.id, created.id));\n  assert.equal((await db.select().from(items).where(eq(items.id, created.id)))[0].name, 'updated');\n  await db.delete(items).where(eq(items.id, created.id));\n  assert.equal((await db.select().from(items)).length, 0);\n} finally { await db.$client.end(); }\n`,
        env,
      );
      record.checks.push(
        "generated Drizzle client and starter schema perform real create, read, update and delete",
      );
      const pythonEnv = {
        ...env,
        DATABASE_URL: url.replace("postgresql://", "postgresql+psycopg://"),
      };
      const sqlalchemy = await createProject(
        parent,
        "sqlalchemy-app",
        ["postgresql", "sqlalchemy"],
        pythonEnv,
        true,
      );
      await script(
        sqlalchemy,
        "live_sqlalchemy.py",
        `from sqlalchemy import text\nfrom database import create_database_engine\n\nengine = create_database_engine()\ntry:\n    with engine.begin() as connection:\n        connection.execute(text("CREATE TABLE live_sqlalchemy (id integer PRIMARY KEY, name text NOT NULL)"))\n        connection.execute(text("INSERT INTO live_sqlalchemy VALUES (:id, :name)"), {"id": 1, "name": "created"})\n        connection.execute(text("UPDATE live_sqlalchemy SET name = :name WHERE id = :id"), {"id": 1, "name": "updated"})\n        assert connection.execute(text("SELECT name FROM live_sqlalchemy WHERE id = 1")).scalar_one() == "updated"\n        connection.execute(text("DELETE FROM live_sqlalchemy WHERE id = 1"))\n        assert connection.execute(text("SELECT count(*) FROM live_sqlalchemy")).scalar_one() == 0\nfinally:\n    engine.dispose()\n`,
        pythonEnv,
        true,
      );
      record.checks.push(
        "generated SQLAlchemy helper and installed Psycopg binary DBAPI perform real create, read, update and delete",
      );
      record.status = "passed";
    } catch (error) {
      record.status = "failed";
      record.error = redact(error instanceof Error ? error.message : String(error));
      failure = sanitizedFailure(error, record.error);
    } finally {
      workDeadline = undefined;
      cleanupDeadline = Date.now() + 120_000;
      try {
        if (started && cwd !== undefined) {
          const logs = await command(
            "docker",
            compose(["logs", "--no-color", "--tail", "60", "db"]),
            cwd,
            env,
            10_000,
          );
          record.diagnostics = redact(logs.stdout + logs.stderr);
          await checked("docker", compose(["down", "--volumes", "--timeout", "10"]), cwd, env);
          expect(
            (
              await checked(
                "docker",
                [
                  "volume",
                  "ls",
                  "--filter",
                  `label=com.docker.compose.project=${project}`,
                  "--format",
                  "{{.Name}}",
                ],
                cwd,
                env,
              )
            ).trim(),
          ).toBe("");
          expect(
            (
              await checked(
                "docker",
                [
                  "ps",
                  "--all",
                  "--filter",
                  `label=com.docker.compose.project=${project}`,
                  "--format",
                  "{{.Names}}",
                ],
                cwd,
                env,
              )
            ).trim(),
          ).toBe("");
        }
        await cleanupWorkspace(parent, false);
        record.cleanup = true;
      } catch (error) {
        record.status = "failed";
        record.error = redact(
          `${record.error ?? ""}\nCleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        failure = sanitizedFailure(error, record.error);
      } finally {
        cleanupDeadline = undefined;
        await retain(record);
        secrets.delete(password);
      }
    }
    if (failure !== undefined) throw failure;
  });

  it("connects the generated Mongoose helper to an authenticated disposable MongoDB service and performs CRUD", async () => {
    workDeadline = Date.now() + 20 * 60_000;
    const parent = await createTempWorkspace("reposetup-live-mongo-");
    const container = `reposetup-live-${randomUUID()}`;
    const password = randomBytes(24).toString("hex");
    secrets.add(password);
    const port = await availablePort();
    const env = {
      ...process.env,
      MONGO_INITDB_ROOT_USERNAME: "liveuser",
      MONGO_INITDB_ROOT_PASSWORD: password,
      MONGODB_URI: `mongodb://liveuser:${password}@127.0.0.1:${port}/livedb?authSource=admin`,
      npm_config_cache: path.join(parent, "npm-cache"),
    };
    const record = evidence("mongodb-generated-mongoose", mongoImage);
    let started = false;
    let failure: unknown;
    try {
      await prerequisites(env);
      const cwd = await createProject(parent, "mongoose-app", ["mongodb", "mongoose"], env);
      record.checks.push(
        "CLI create and doctor install the selected Mongoose dependency and generate its connection helper",
      );
      started = true;
      await checked(
        "docker",
        [
          "run",
          "--detach",
          "--name",
          container,
          "--publish",
          `127.0.0.1:${port}:27017`,
          "--env",
          "MONGO_INITDB_ROOT_USERNAME",
          "--env",
          "MONGO_INITDB_ROOT_PASSWORD",
          mongoImage,
        ],
        parent,
        env,
        300_000,
      );
      await waitFor(
        () =>
          command(
            "docker",
            [
              "exec",
              container,
              "mongosh",
              "--quiet",
              "--eval",
              "const c = new Mongo('mongodb://' + process.env.MONGO_INITDB_ROOT_USERNAME + ':' + process.env.MONGO_INITDB_ROOT_PASSWORD + '@127.0.0.1:27017/admin'); if (c.getDB('admin').runCommand({ping: 1}).ok !== 1) quit(1);",
            ],
            parent,
            env,
            10_000,
          ),
        "MongoDB",
      );
      expect((await checked("docker", ["port", container, "27017/tcp"], parent, env)).trim()).toBe(
        `127.0.0.1:${port}`,
      );
      record.imageDigests = (
        await checked(
          "docker",
          ["image", "inspect", mongoImage, "--format", "{{json .RepoDigests}}"],
          parent,
          env,
        )
      ).trim();
      record.serviceVersion =
        (await checked("docker", ["exec", container, "mongod", "--version"], parent, env))
          .trim()
          .split("\n")[0] ?? "";
      expect(record.serviceVersion).toContain("8.0.32");
      // Mongoose's JavaScript helper needs no loader or replacement connection code.
      const file = path.join(cwd, "live-mongoose.mjs");
      await writeFile(
        file,
        `import assert from 'node:assert/strict';\nimport { connectMongo, mongoose } from './src/mongoose.js';\ntry {\n  await connectMongo();\n  const Item = mongoose.model('LiveItem', new mongoose.Schema({ name: { type: String, required: true } }));\n  const created = await Item.create({ name: 'created' });\n  await Item.updateOne({ _id: created._id }, { name: 'updated' });\n  assert.equal((await Item.findById(created._id)).name, 'updated');\n  await Item.deleteOne({ _id: created._id });\n  assert.equal(await Item.countDocuments(), 0);\n} finally { await mongoose.disconnect(); }\n`,
        { flag: "wx" },
      );
      await checked(process.execPath, [file], cwd, env);
      record.checks.push(
        "authenticated loopback MongoDB connection; generated Mongoose helper and model perform real create, read, update and delete",
      );
      record.status = "passed";
    } catch (error) {
      record.status = "failed";
      record.error = redact(error instanceof Error ? error.message : String(error));
      failure = sanitizedFailure(error, record.error);
    } finally {
      workDeadline = undefined;
      cleanupDeadline = Date.now() + 120_000;
      try {
        if (started) {
          const logs = await command(
            "docker",
            ["logs", "--tail", "60", container],
            parent,
            env,
            10_000,
          );
          record.diagnostics = redact(logs.stdout + logs.stderr);
          await checked("docker", ["rm", "--force", "--volumes", container], parent, env);
          expect(
            (
              await checked(
                "docker",
                ["ps", "--all", "--filter", `name=^${container}$`, "--format", "{{.Names}}"],
                parent,
                env,
              )
            ).trim(),
          ).toBe("");
        }
        await cleanupWorkspace(parent, false);
        record.cleanup = true;
      } catch (error) {
        record.status = "failed";
        record.error = redact(
          `${record.error ?? ""}\nCleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        failure = sanitizedFailure(error, record.error);
      } finally {
        cleanupDeadline = undefined;
        await retain(record);
        secrets.delete(password);
      }
    }
    if (failure !== undefined) throw failure;
  });
});
