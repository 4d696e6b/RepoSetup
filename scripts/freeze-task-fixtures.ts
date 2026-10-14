import { writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import { TASK_BENCHMARK_FIXTURE_IDS } from "../packages/core/dist/index.js";
import { fixtureManifest, fixtureRoot } from "../tests/tasks/fixture-tools.ts";
for (const fixtureId of TASK_BENCHMARK_FIXTURE_IDS) {
  const manifest = await fixtureManifest(fixtureId);
  await writeFile(
    path.join(fixtureRoot, fixtureId, "manifest.json"),
    await format(JSON.stringify(manifest), { parser: "json", tabWidth: 2, printWidth: 100 }),
  );
  process.stdout.write(`${fixtureId}: ${manifest.fixtureRevision}\n`);
}
