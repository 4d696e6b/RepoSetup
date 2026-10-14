import assert from "node:assert/strict";
import { checkPath } from "../../src/path-policy.js";
const facts = (extra = {}) => ({
  root: "/repo",
  canonical: "/repo/src/a.ts",
  symlink: false,
  contained: true,
  binary: false,
  text: "data",
  hash: "hash",
  ...extra,
});
export const cases = [
  { id: "compat-safe", run: () => assert.equal(checkPath("src/a.ts", facts()), null) },
];
