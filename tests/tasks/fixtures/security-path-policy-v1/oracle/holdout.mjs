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
    id: "sec-safe",
    run: () => {
      assert.equal(normalizePath("src\\a.ts"), "src/a.ts");
      assert.equal(checkPath("src/a.ts", facts()), null);
    },
  },
  {
    id: "sec-traversal",
    run: () => {
      for (const p of [
        "",
        "/a",
        "C:/a",
        "C:a",
        "\\\\server/a",
        "src//a",
        "src/./a",
        "src/../a",
        "src\\..\\a",
        "src/\0a",
      ])
        assert.equal(normalizePath(p), null);
    },
  },
  {
    id: "sec-canonical",
    run: () => {
      for (const f of [
        undefined,
        facts({ canonical: null }),
        facts({ canonical: "/other/a" }),
        facts({ contained: null }),
        facts({ symlink: true, contained: false }),
      ])
        assert.equal(checkPath("src/a.ts", f), "outside_root");
    },
  },
  {
    id: "sec-excluded",
    run: () => {
      for (const p of [
        ".git/x",
        "node_modules/x",
        "dist/x",
        ".env",
        ".env.local",
        "credentials.json",
        "id_rsa",
      ])
        assert.equal(checkPath(p, facts()), "excluded");
      assert.equal(checkPath("src/a.ts", facts({ binary: true })), "binary");
      assert.equal(checkPath(".env.example", facts({ text: "FIXTURE_PRIVATE_MARKER" })), "secret");
      assert.equal(checkPath(".env.example", facts({ text: "TOKEN=your-token-here" })), null);
    },
  },
  {
    id: "sec-deny-first",
    run: () => {
      assert.deepEqual(
        selectContext(["src/a.ts"], { "src/a.ts": facts() }, { ...policy, deny: ["src/a.ts"] }),
        { selected: [], excluded: [{ path: "src/a.ts", reason: "denied" }] },
      );
    },
  },
  {
    id: "sec-unresolved",
    run: () => {
      assert.deepEqual(selectContext(["src/b.ts"], { "src/b.ts": facts() }, policy), {
        selected: [],
        excluded: [{ path: "src/b.ts", reason: "unresolved" }],
      });
    },
  },
  {
    id: "sec-metadata",
    run: () => {
      const result = selectContext(
        ["src/a.ts", ".env"],
        { "src/a.ts": facts(), ".env": facts({ text: "FIXTURE_PRIVATE_MARKER" }) },
        { ...policy, read: ["src/a.ts", ".env"] },
      );
      assert.deepEqual(result.selected, [{ path: "src/a.ts", hash: "hash" }]);
      assert.equal(JSON.stringify(result).includes("FIXTURE_PRIVATE_MARKER"), false);
    },
  },
];
