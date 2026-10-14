import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  sealTaskBenchmarkFixture,
  validateTaskBenchmarkFixture,
  type TaskBenchmarkFixture,
} from "./benchmark-fixture.js";
// Frozen real input: boundary tests do not manufacture a second competing fixture contract.
const fixture = JSON.parse(
  readFileSync(
    new URL("../../../../tests/tasks/fixtures/types-result-v1/manifest.json", import.meta.url),
    "utf8",
  ),
) as TaskBenchmarkFixture;
function reseal(change: (draft: TaskBenchmarkFixture) => void) {
  const draft = structuredClone(fixture);
  change(draft);
  const { fixtureRevision: _revision, ...payload } = draft;
  void _revision;
  return sealTaskBenchmarkFixture(payload);
}
describe("frozen benchmark boundaries", () => {
  it("accepts the frozen fixture and rejects tampered bytes before qualification", () => {
    expect(validateTaskBenchmarkFixture(fixture).success).toBe(true);
    const changed = structuredClone(fixture);
    changed.seedFiles[0]!.bytes++;
    expect(validateTaskBenchmarkFixture(changed)).toMatchObject({
      success: false,
      error: { code: "TASK_BENCHMARK_INVALID" },
    });
  });
  it("cannot authorize protected writes by rehashing a manifest", () => {
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.write.push("tsconfig.json");
        }),
      ).success,
    ).toBe(false);
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.referenceFiles[0]!.path = ".env";
        }),
      ).success,
    ).toBe(false);
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.write[0] = "../outside.ts";
        }),
      ).success,
    ).toBe(false);
  });
  it("rejects criterion gaps, reordered inventories, changed ceilings and executable fields", () => {
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.testInventory.forEach((t) => {
            t.criterionIds = t.criterionIds.filter((id) => id !== "type-4");
          });
        }),
      ).success,
    ).toBe(false);
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.seedFiles.reverse();
        }),
      ).success,
    ).toBe(false);
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.resourceLimits.maxProviderCalls++;
        }),
      ).success,
    ).toBe(false);
    expect(validateTaskBenchmarkFixture({ ...fixture, command: "curl forbidden" }).success).toBe(
      false,
    );
  });
  it("rejects a rehashed reduction of the reviewed public test inventory", () => {
    expect(
      validateTaskBenchmarkFixture(
        reseal((f) => {
          f.publicTestIds[1] = f.publicTestIds[0]!;
        }),
      ).success,
    ).toBe(false);
  });
});
