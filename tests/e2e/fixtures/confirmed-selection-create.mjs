import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

// Only terminal I/O and the human answer are adapted. The installed artifact supplies
// parsing, registry, preflight, planning, filesystem adapters and process execution.
const [entry, selectionFile, transport, requestedMode] = process.argv.slice(2);
assert.ok(entry && selectionFile);
assert.ok(transport === "token" || transport === "file");
const mode = requestedMode ?? "create";
assert.ok(mode === "create" || mode === "add");
const { runCli } = await import(pathToFileURL(entry).href);
const selection = await readFile(selectionFile, "utf8");
const input =
  transport === "token"
    ? ["--selection", Buffer.from(selection).toString("base64url")]
    : [mode === "create" ? "--selection-file" : "--config", selectionFile];
let stdout = "";
let stderr = "";
const result = await runCli(["--no-color", "--json", mode, ...input], {
  cwd: process.cwd(),
  io: {
    writeOut(text) {
      stdout += text;
      process.stdout.write(text);
    },
    writeErr(text) {
      stderr += text;
      process.stderr.write(text);
    },
  },
  confirmCreate: async () => {
    assert.ok(stderr.includes(`Decoded selection (${mode},`));
    const review = JSON.parse(stdout.trim());
    assert.equal(review.version, 1);
    assert.equal(review.kind, "plan");
    assert.equal(review.dryRun, false);
    assert.ok(review.plan.operations.length > 0);
    process.stderr.write("Qualification adapter: reviewed choices and plan; confirmed.\n");
    return true;
  },
});
process.exitCode = result.exitCode;
