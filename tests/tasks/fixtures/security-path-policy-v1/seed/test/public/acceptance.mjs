import assert from "node:assert/strict";
import { normalizePath, checkPath } from "../../src/path-policy.js";
import { selectContext } from "../../src/context-policy.js";
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
const policy = { read: ["src/a.ts"], write: ["src/a.ts"], deny: [] };
export const cases = [
  {
    id: "public-example",
    run: () => {
      assert.equal(normalizePath("src\\a.ts"), "src/a.ts");
      assert.equal(checkPath("src/a.ts", facts()), null);
    },
  },
  { id: "public-traversal", run: () => assert.equal(normalizePath("src/../private"), null) },
  {
    id: "public-deny-overlap",
    run: () =>
      assert.deepEqual(
        selectContext(["src/a.ts"], { "src/a.ts": facts() }, { ...policy, deny: ["src/a.ts"] }),
        { selected: [], excluded: [{ path: "src/a.ts", reason: "denied" }] },
      ),
  },
];
