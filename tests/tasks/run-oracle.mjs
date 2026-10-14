import process from "node:process";
import { pathToFileURL } from "node:url";
import path from "node:path";
// Test infrastructure only. The fixed runner executes frozen cases in a fresh
// child with a cleared environment; this is never a model/config tool.
const root = process.argv[2],
  suite = process.argv[3];
if (!root || !path.isAbsolute(root) || !["compat", "public", "holdout"].includes(suite))
  throw new Error("Invalid frozen oracle invocation");
const file =
  suite === "holdout"
    ? "test/public/holdout.mjs"
    : suite === "compat"
      ? "test/public/compat.mjs"
      : "test/public/acceptance.mjs";
const { cases } = await import(pathToFileURL(path.join(root, file)).href);
const results = [];
for (const { id, run } of cases) {
  try {
    await run();
    results.push({ testId: id, passed: true });
  } catch {
    results.push({ testId: id, passed: false });
  }
}
process.stdout.write(JSON.stringify({ kind: "frozen_oracle_result", schemaVersion: 1, results }));
process.exitCode = results.length && results.every((r) => r.passed) ? 0 : 1;
