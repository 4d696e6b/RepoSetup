import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { pathToFileURL } from "node:url";
import { createDefaultProcessRunner } from "../execution-adapters.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readFile,
  writeFile,
  readdir,
  lstat,
  chmod,
  symlink,
  link,
  mkdir,
  unlink,
  rename,
} from "node:fs/promises";
import path from "node:path";
import { sealTaskRunCheckpoint, taskByteHash, taskFailure } from "@reposetup/core";
import { createTaskRunAdapter } from "./application-adapter.js";
import { inspectTaskProjectLock } from "./run-state-adapter.js";
import { runFixture, HASH, CONFIGURATION, LIMITS } from "./run-fixture.test-helper.js";
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function fixture() {
  const f = await runFixture();
  cleanups.push(f.cleanup);
  return f;
}
async function diskState(f: Awaited<ReturnType<typeof fixture>>, runId: string) {
  const folder = path.join(f.stateRoot, taskByteHash(f.root).slice(7));
  return { folder, file: path.join(folder, `${runId}.json`) };
}
describe("durable scoped task executor", () => {
  it("makes dry-run zero-port-call and leaves state/project untouched", async () => {
    const f = await fixture();
    const acquire = vi.spyOn(f.adapter, "acquire"),
      snapshot = vi.spyOn(f.adapter, "snapshot");
    const before = await readdir(f.stateRoot);
    const result = await f.execute({ type: "create", resourceLimits: LIMITS }, { dryRun: true });
    expect(result.success && result.data.dryRun).toBe(true);
    expect(acquire).not.toHaveBeenCalled();
    expect(snapshot).not.toHaveBeenCalled();
    expect(await readdir(f.stateRoot)).toEqual(before);
  });
  it("applies exact files and parents, accepts dependencies and requires final phase review", async () => {
    const f = await fixture();
    const created = await f.create(),
      id = created.run.runId;
    expect(created.run.tasks.every((t) => t.status === "queued")).toBe(true);
    const blocked = await f.execute({
      type: "begin",
      runId: id,
      taskId: "consumer",
      requestedConfiguration: CONFIGURATION,
      routingId: HASH,
    });
    expect(blocked.success).toBe(false);
    const begun = await f.begin(id);
    const applied = await f.requireRun({
      type: "apply",
      runId: id,
      proposal: f.proposal(begun, f.producerChanges),
    });
    expect(applied.run.attempts[0]!.application.status).toBe("applied");
    expect(applied.journal.map((e) => [e.type, e.path, e.status])).toEqual([
      ["directory", "src/new", "applied"],
      ["file", "src/a.ts", "applied"],
      ["file", "src/new/b.ts", "applied"],
    ]);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toBe("export const a = 2;\r\n");
    const accepted = await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    expect(accepted.run.tasks.find((t) => t.taskId === "producer")!.status).toBe("accepted");
    expect(accepted.run.acceptedArtifacts[0]!.paths).toHaveLength(2);
    const consumer = await f.begin(id, "consumer");
    await f.requireRun({
      type: "apply",
      runId: id,
      proposal: f.proposal(consumer, [
        {
          type: "create_text",
          path: "src/c.ts",
          expectedState: "absent",
          content: 'import { a } from "./a.js";\nexport const c = a;\n',
        },
      ]),
    });
    await f.requireRun({ type: "verify", runId: id, taskId: "consumer" });
    const done = await f.requireRun({ type: "finalize", runId: id });
    expect(done.run.status).toBe("succeeded");
    expect(done.run.finalVerification?.target.type).toBe("phase");
    expect(f.reviews.at(-1)).toBe("phase.acceptance");
    const stored = await diskState(f, id);
    expect((await lstat(stored.file)).mode & 0o777).toBe(0o600);
    const text = await readFile(stored.file, "utf8");
    expect(text).not.toContain("export const a");
    expect(text).not.toContain("oldText");
    expect(await readdir(f.root)).toEqual(["docs", "src"]);
    expect((await f.execute({ type: "reconcile", runId: id })).success).toBe(false);
  });
  it("batch preflight failure, stale output and stale state cause zero project effects", async () => {
    const f = await fixture();
    const id = (await f.create()).run.runId,
      c = await f.begin(id);
    const r = await f.execute({
      type: "apply",
      runId: id,
      proposal: f.proposal(c, [
        f.producerChanges[0],
        { ...f.producerChanges[1], path: "src/escape.ts" },
      ]),
    });
    expect(r.success).toBe(false);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("1;");
    expect(await readdir(path.join(f.root, "src"))).toEqual(["a.ts"]);
    expect(
      (await f.execute({ type: "no_change", runId: id }, { expectedStateRevision: 1 })).success,
    ).toBe(false);
    await writeFile(path.join(f.root, "src/a.ts"), "external edit\n");
    expect(
      (await f.execute({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) }))
        .success,
    ).toBe(false);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toBe("external edit\n");
  });
  it("rejects concurrent runs and active lease recovery", async () => {
    const f = await fixture(),
      lease = await f.adapter.acquire();
    if (!lease.success) throw new Error("lease");
    const result = await f.execute({ type: "create", resourceLimits: LIMITS });
    expect(result.success).toBe(false);
    const lock = await inspectTaskProjectLock(f.stateRoot, f.root);
    if (!lock.success || !lock.data) throw new Error("lock");
    expect((await f.adapter.acquire(lock.data.token)).success).toBe(false);
    expect((await lease.data.release()).success).toBe(true);
    expect((await lease.data.release()).success).toBe(false);
    expect((await f.create()).run.stateRevision).toBe(1);
  });
  it("preserves a first effect when a later install fails and reconciles without replay", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    const original = f.adapter.install;
    let count = 0;
    f.adapter = {
      ...f.adapter,
      install: async (...args) =>
        ++count === 2 ? taskFailure("TASK_CHANGE_APPLY_FAILED", "injected") : original(...args),
    };
    const applied = await f.requireRun({
      type: "apply",
      runId: id,
      proposal: f.proposal(c, f.producerChanges),
    });
    expect(applied.run.attempts[0]!.application.status).toBe("partially_applied");
    expect(applied.run.status).toBe("needs_review");
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("2;");
    expect(
      (await f.execute({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) }))
        .success,
    ).toBe(false);
    const reconciled = await f.requireRun({ type: "reconcile", runId: id, reviewed: true });
    expect(reconciled.journal.at(-1)!.status).toBe("not_applied");
    expect(reconciled.run.activeAttemptId).toBeNull();
    const retry = await f.begin(id);
    expect(retry.run.attempts).toHaveLength(2);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("2;");
  });
  it("retains a write when effect persistence fails, records uncertainty and forbids acceptance/replay", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    const acquire = f.adapter.acquire;
    // Inject persistence failure on the actual lease; copied objects are not install authority.
    f.adapter = {
      ...f.adapter,
      acquire: async (token) => {
        const got = await acquire(token);
        if (!got.success) return got;
        const save = got.data.save;
        got.data.save = async (next, expected) =>
          next.journal.some((e) => e.type === "file" && e.status === "applied")
            ? taskFailure("TASK_STATE_WRITE_FAILED", "injected")
            : save(next, expected);
        return got;
      },
    };
    const failed = await f.execute({
      type: "apply",
      runId: id,
      proposal: f.proposal(c, f.producerChanges),
    });
    expect(failed.success).toBe(false);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("2;");
    f.adapter = { ...f.adapter, acquire };
    const reconciled = await f.requireRun({ type: "reconcile", runId: id, reviewed: true });
    expect(reconciled.run.status).toBe("needs_review");
    expect(reconciled.journal.find((e) => e.path === "src/a.ts")!.status).toBe("unknown");
    expect((await f.execute({ type: "verify", runId: id, taskId: "producer" })).success).toBe(
      false,
    );
    expect(
      (await f.execute({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) }))
        .success,
    ).toBe(false);
  });
  it("detects corrupted, permissive, symlinked and hardlinked state", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      s = await diskState(f, id);
    const bytes = await readFile(s.file);
    await writeFile(s.file, '{"kind":"task_run_checkpoint","kind":"phase_run"}');
    expect((await f.execute({ type: "reconcile", runId: id })).success).toBe(false);
    await writeFile(s.file, bytes);
    await chmod(s.file, 0o644);
    expect((await f.execute({ type: "reconcile", runId: id })).success).toBe(false);
    await chmod(s.file, 0o600);
    await link(s.file, path.join(f.stateRoot, "alias.json"));
    expect((await f.execute({ type: "reconcile", runId: id })).success).toBe(false);
    await unlink(path.join(f.stateRoot, "alias.json"));
    await unlink(s.file);
    await symlink(path.join(f.root, "src/a.ts"), s.file);
    expect((await f.execute({ type: "reconcile", runId: id })).success).toBe(false);
  });
  it("rejects escaping parent links, case aliases and hardlinked project targets before effects", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    await symlink(f.stateRoot, path.join(f.root, "src/new"));
    expect(
      (await f.execute({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) }))
        .success,
    ).toBe(false);
    await unlink(path.join(f.root, "src/new"));
    await link(path.join(f.root, "src/a.ts"), path.join(f.root, "src/alias.ts"));
    expect(
      (await f.execute({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) }))
        .success,
    ).toBe(false);
    await unlink(path.join(f.root, "src/alias.ts"));
    const adapter = await createTaskRunAdapter({
      projectRoot: f.root,
      stateRoot: f.stateRoot,
      authority: { ...f.policy.authority, write: ["src/A.ts"] },
    });
    if (!adapter.success) throw new Error("adapter");
    expect(
      (
        await adapter.data.preflight([
          { path: "src/A.ts", beforeHash: null, afterHash: HASH, text: "test", changeIndex: 0 },
        ])
      ).success,
    ).toBe(false);
  });
  it("invalidates accepted output and blocks transitive consumers instead of reusing a pass flag", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    await f.requireRun({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) });
    await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    await writeFile(path.join(f.root, "src/a.ts"), "changed after acceptance\n");
    const state = await f.requireRun({ type: "reconcile", runId: id });
    expect(state.run.tasks.find((t) => t.taskId === "producer")!.status).toBe("invalidated");
    expect(state.run.tasks.find((t) => t.taskId === "consumer")!.status).toBe("blocked");
    expect(state.run.acceptedArtifacts).toEqual([]);
  });
  it("retains failed verification edits and supports explicit no-change with fresh acceptance", async () => {
    const f = await fixture();
    await mkdir(path.join(f.root, "src/new"));
    await writeFile(path.join(f.root, "src/new/b.ts"), "export const b = 2;\n");
    const id = (await f.create()).run.runId;
    await f.begin(id);
    await f.requireRun({ type: "no_change", runId: id });
    f.exitCode = 1;
    const failed = await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    expect(failed.run.tasks.find((t) => t.taskId === "producer")!.status).toBe("needs_repair");
    expect(failed.run.acceptedArtifacts).toEqual([]);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("1;");
    const retry = await f.begin(id);
    expect(retry.run.attempts[1]!.attemptNumber).toBe(2);
    await f.requireRun({ type: "no_change", runId: id });
    f.exitCode = 0;
    expect(
      (await f.requireRun({ type: "verify", runId: id, taskId: "producer" })).run.acceptedArtifacts,
    ).toHaveLength(1);
  });
  it("rehashed fabricated accepted state cannot unlock a dependent", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    const { checkpointHash: _hash, ...value } = structuredClone(c);
    void _hash;
    value.run.activeAttemptId = null;
    value.run.tasks.find((t) => t.taskId === "producer")!.status = "accepted";
    value.run.tasks.find((t) => t.taskId === "producer")!.acceptedVerificationId = HASH;
    const state = await diskState(f, id);
    await writeFile(state.file, JSON.stringify(sealTaskRunCheckpoint(value)));
    expect(
      (
        await f.execute({
          type: "begin",
          runId: id,
          taskId: "consumer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        })
      ).success,
    ).toBe(false);
  });
  it("resumes a fully recorded interrupted batch only after explicit reconciliation, without applying twice", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    const acquire = f.adapter.acquire;
    let injected = false;
    f.adapter = {
      ...f.adapter,
      acquire: async (token) => {
        const got = await acquire(token);
        if (!got.success) return got;
        const save = got.data.save;
        got.data.save = async (next, expected) => {
          if (!injected && next.run.attempts[0]?.application.status === "applied") {
            injected = true;
            return taskFailure("TASK_STATE_WRITE_FAILED", "injected");
          }
          return save(next, expected);
        };
        return got;
      },
    };
    expect(
      (await f.execute({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) }))
        .success,
    ).toBe(false);
    f.adapter = { ...f.adapter, acquire };
    expect((await f.execute({ type: "verify", runId: id, taskId: "producer" })).success).toBe(
      false,
    );
    const observed = await f.requireRun({ type: "reconcile", runId: id });
    expect(observed.run.status).toBe("needs_review");
    const reviewed = await f.requireRun({ type: "reconcile", runId: id, reviewed: true });
    expect(reviewed.run.attempts[0]!.status).toBe("verifying");
    const accepted = await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    expect(accepted.run.tasks.find((t) => t.taskId === "producer")!.status).toBe("accepted");
    expect(accepted.journal.filter((e) => e.type === "file")).toHaveLength(2);
  });
  it("does not reset unknown allowance after an interrupted verification commit", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    await f.requireRun({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) });
    const acquire = f.adapter.acquire;
    f.adapter = {
      ...f.adapter,
      acquire: async (token) => {
        const got = await acquire(token);
        if (!got.success) return got;
        const save = got.data.save;
        got.data.save = async (next, expected) =>
          next.run.attempts[0]?.verification
            ? taskFailure("TASK_STATE_WRITE_FAILED", "injected")
            : save(next, expected);
        return got;
      },
    };
    expect((await f.execute({ type: "verify", runId: id, taskId: "producer" })).success).toBe(
      false,
    );
    f.adapter = { ...f.adapter, acquire };
    expect((await f.execute({ type: "verify", runId: id, taskId: "producer" })).success).toBe(
      false,
    );
    const observed = await f.requireRun({ type: "reconcile", runId: id, reviewed: true });
    expect(observed.run.status).toBe("needs_review");
    expect(observed.bindings[0]!.verificationPending).toBe(true);
    expect(
      (
        await f.execute({
          type: "begin",
          runId: id,
          taskId: "consumer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        })
      ).success,
    ).toBe(false);
  });
  it("fresh verification is required to unlock persisted acceptance in a new process", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    await f.requireRun({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) });
    await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    const stored = await diskState(f, id),
      snapshot = await f.adapter.snapshot();
    if (!snapshot.success) throw new Error("snapshot");
    const core = pathToFileURL(path.resolve("../core/dist/index.js")).href;
    const script = `const {executeTaskRun,taskByteHash}=await import(process.argv[1]);const {readFile}=await import('node:fs/promises');const p=JSON.parse(process.argv[2]);const c=JSON.parse(await readFile(process.argv[3],'utf8'));const snapshot=JSON.parse(process.argv[4]);const root=process.argv[5];const adapter={rootInstance:c.rootInstance,snapshot:async()=>({success:true,data:snapshot}),acquire:async()=>({success:true,data:{load:async()=>({success:true,data:c}),save:async()=>{throw Error('no save')},release:async()=>({success:true,data:true})}}),repository:{inventory:async()=>({success:true,data:{rootIdentity:c.run.project.rootIdentity,entries:[]}}),read:async(relative)=>{try{const text=await readFile(root+'/'+relative,'utf8');return {success:true,data:{text,fileHash:taskByteHash(text)}}}catch(e){if(e.code==='ENOENT')return {success:true,data:null};throw e;}}}};const r=await executeTaskRun({...p,adapter});process.stdout.write(JSON.stringify(r.success?'unexpected':r.error.code));`;
    const r = await createDefaultProcessRunner()({
      command: process.execPath,
      args: [
        "--input-type=module",
        "-e",
        script,
        core,
        JSON.stringify({
          plan: f.plan,
          compilationPolicy: f.policy,
          operation: {
            type: "begin",
            runId: id,
            taskId: "consumer",
            requestedConfiguration: CONFIGURATION,
            routingId: HASH,
          },
        }),
        stored.file,
        JSON.stringify(snapshot.data),
        f.root,
      ],
      cwd: f.root,
      timeoutMs: 10000,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe('"TASK_NEEDS_REVIEW"');
  });
  it("reclaims only an explicitly reviewed dead local lease, never an active or guessed token", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      stored = await diskState(f, id);
    const child = await createDefaultProcessRunner()({
      command: process.execPath,
      args: ["-e", "process.stdout.write(String(process.pid))"],
      cwd: f.root,
      timeoutMs: 10000,
    });
    expect(child.exitCode).toBe(0);
    const pid = Number(child.stdout),
      token = randomUUID();
    await writeFile(
      path.join(stored.folder, "project.lock"),
      JSON.stringify({ pid, token, host: hostname() }),
      { mode: 0o600 },
    );
    expect((await f.execute({ type: "reconcile", runId: id })).success).toBe(false);
    expect(
      (await f.execute({ type: "reconcile", runId: id }, { recoverLockToken: randomUUID() }))
        .success,
    ).toBe(false);
    expect(
      (await f.execute({ type: "reconcile", runId: id }, { recoverLockToken: token })).success,
    ).toBe(true);
    expect(await inspectTaskProjectLock(f.stateRoot, f.root)).toEqual({
      success: true,
      data: null,
    });
  });
  it("enforces CAS, state location/privacy and root identity", async () => {
    const f = await fixture(),
      c = await f.create(),
      lease = await f.adapter.acquire();
    if (!lease.success) throw new Error("lease");
    expect((await lease.data.save(c, c.run.stateRevision)).success).toBe(false);
    await lease.data.release();
    const nested = path.join(f.root, "state");
    await mkdir(nested, { mode: 0o700 });
    expect(
      (
        await createTaskRunAdapter({
          projectRoot: f.root,
          stateRoot: nested,
          authority: f.policy.authority,
        })
      ).success,
    ).toBe(false);
    await chmod(f.stateRoot, 0o755);
    expect(
      (
        await createTaskRunAdapter({
          projectRoot: f.root,
          stateRoot: f.stateRoot,
          authority: f.policy.authority,
        })
      ).success,
    ).toBe(false);
    await chmod(f.stateRoot, 0o700);
    await rename(f.root, `${f.root}-old`);
    await mkdir(f.root);
    expect((await f.execute({ type: "reconcile", runId: c.run.runId })).success).toBe(false);
  });
  it("blocks oracle writes before state effects and prevents exceeded attempts and wall allowances", async () => {
    const f = await fixture();
    f.immutablePaths = ["src/a.ts"];
    expect((await f.execute({ type: "create", resourceLimits: LIMITS })).success).toBe(false);
    expect(await readdir(f.stateRoot)).toEqual([]);
    f.immutablePaths = [];
    await mkdir(path.join(f.root, "src/new"));
    await writeFile(path.join(f.root, "src/new/b.ts"), "existing\n");
    const id = (await f.create()).run.runId;
    f.exitCode = 1;
    for (let i = 0; i < 3; i++) {
      await f.begin(id);
      await f.requireRun({ type: "no_change", runId: id });
      await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    }
    expect(
      (
        await f.execute({
          type: "begin",
          runId: id,
          taskId: "producer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        })
      ).success,
    ).toBe(false);
    const empty = await f.create(),
      stored = await diskState(f, empty.run.runId);
    const { checkpointHash: _hash, ...value } = structuredClone(empty);
    void _hash;
    value.run.resourceLedger.consumed.durationMs = value.run.resourceLimits.maxWallTimeMs;
    await writeFile(stored.file, JSON.stringify(sealTaskRunCheckpoint(value)));
    expect(
      (
        await f.execute({
          type: "begin",
          runId: empty.run.runId,
          taskId: "producer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        })
      ).success,
    ).toBe(false);
  });
  it("cancels before any adapter call and preserves a completed effect on mid-batch cancellation", async () => {
    const f = await fixture(),
      pre = new AbortController();
    pre.abort();
    const acquire = vi.spyOn(f.adapter, "acquire");
    expect(
      (await f.execute({ type: "create", resourceLimits: LIMITS }, { signal: pre.signal })).success,
    ).toBe(false);
    expect(acquire).not.toHaveBeenCalled();
    const id = (await f.create()).run.runId,
      c = await f.begin(id),
      controller = new AbortController();
    const install = f.adapter.install;
    f.adapter = {
      ...f.adapter,
      install: async (...args) => {
        const result = await install(...args);
        controller.abort();
        return result;
      },
    };
    const retained = await f.requireRun(
      { type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) },
      { signal: controller.signal },
    );
    expect(retained.run.attempts[0]!.application.status).toBe("partially_applied");
    expect(retained.run.status).toBe("needs_review");
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toContain("2;");
  });
  it("rejects unknown host operations and malformed dry-run proposals before touching a port", async () => {
    const f = await fixture(),
      acquire = vi.spyOn(f.adapter, "acquire"),
      snapshot = vi.spyOn(f.adapter, "snapshot");
    const operation = { type: "run_command", command: "bad" } as unknown as Parameters<
      typeof f.execute
    >[0];
    expect((await f.execute(operation)).success).toBe(false);
    expect(
      (
        await f.execute(
          {
            type: "apply",
            runId: "123e4567-e89b-42d3-a456-426614174000",
            proposal: { command: "bad" },
          },
          { dryRun: true },
        )
      ).success,
    ).toBe(false);
    expect(acquire).not.toHaveBeenCalled();
    expect(snapshot).not.toHaveBeenCalled();
  });
  it("refuses unrelated changes between application and verification instead of accepting a new baseline", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    await f.requireRun({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) });
    await writeFile(path.join(f.root, "src/unrelated.ts"), "retained external edit\n");
    expect((await f.execute({ type: "verify", runId: id, taskId: "producer" })).success).toBe(
      false,
    );
    const observed = await f.requireRun({ type: "reconcile", runId: id, reviewed: true });
    expect(observed.run.status).toBe("needs_review");
    expect(await readFile(path.join(f.root, "src/unrelated.ts"), "utf8")).toBe(
      "retained external edit\n",
    );
    expect(f.reviews).toEqual([]);
  });
  it("binds physical root identity across a newly constructed adapter", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId;
    await rename(f.root, `${f.root}-old`);
    await mkdir(f.root);
    await mkdir(path.join(f.root, "src"));
    await mkdir(path.join(f.root, "docs"));
    await writeFile(path.join(f.root, "src/a.ts"), "export const a = 1;\r\n");
    await writeFile(path.join(f.root, "docs/phase.md"), "# Phase\nRequirements.\n");
    const rebuilt = await createTaskRunAdapter({
      projectRoot: f.root,
      stateRoot: f.stateRoot,
      authority: f.policy.authority,
    });
    if (!rebuilt.success) throw new Error("adapter");
    f.adapter = rebuilt.data;
    const result = await f.execute({ type: "reconcile", runId: id });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("TASK_PROJECT_DRIFT");
  });
  it("does not adopt an unrecorded edit of a failed attempt's formerly owned path", async () => {
    const f = await fixture(),
      id = (await f.create()).run.runId,
      c = await f.begin(id);
    await f.requireRun({ type: "apply", runId: id, proposal: f.proposal(c, f.producerChanges) });
    f.exitCode = 1;
    await f.requireRun({ type: "verify", runId: id, taskId: "producer" });
    await writeFile(path.join(f.root, "src/a.ts"), "external manual edit\n");
    expect(
      (
        await f.execute({
          type: "begin",
          runId: id,
          taskId: "producer",
          requestedConfiguration: CONFIGURATION,
          routingId: HASH,
        })
      ).success,
    ).toBe(false);
    expect(await readFile(path.join(f.root, "src/a.ts"), "utf8")).toBe("external manual edit\n");
  });
});
