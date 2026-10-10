import assert from "node:assert/strict";
import { legacyTotal } from "../../src/legacy-consumer.js";
export const cases = [
  { id: "compat-legacy", run: () => assert.deepEqual(legacyTotal(), { ok: true, value: 100 }) },
];
