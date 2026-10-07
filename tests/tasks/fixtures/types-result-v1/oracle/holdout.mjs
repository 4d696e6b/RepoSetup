import assert from "node:assert/strict";
import { decodePage } from "../../src/page.js";
import { mapResult } from "../../src/result.js";
export const cases = [
  {
    id: "page-unknown",
    run: () => {
      assert.deepEqual(decodePage({ items: [], nextCursor: null, extra: 1 }), {
        ok: false,
        error: [{ path: "extra", code: "unknown" }],
      });
    },
  },
  {
    id: "page-valid",
    run: () => {
      const v = { items: [{ id: "a", label: "A" }], nextCursor: "next" };
      assert.deepEqual(decodePage(v), { ok: true, value: v });
    },
  },
  {
    id: "page-duplicates",
    run: () => {
      const r = decodePage({
        items: [
          { id: "a", label: "A" },
          { id: "a", label: "B" },
        ],
        nextCursor: null,
      });
      assert.deepEqual(r.error, [{ path: "items.1.id", code: "duplicate" }]);
    },
  },
  {
    id: "page-root-types",
    run: () => {
      for (const v of [null, 1, true, "x", []])
        assert.deepEqual(decodePage(v), { ok: false, error: [{ path: "$", code: "type" }] });
    },
  },
  {
    id: "page-parent-type",
    run: () => {
      assert.deepEqual(decodePage({ items: [null], nextCursor: null }), {
        ok: false,
        error: [{ path: "items.0", code: "type" }],
      });
    },
  },
  {
    id: "page-issues-sorted",
    run: () => {
      assert.deepEqual(decodePage({ items: [{ id: "", other: 1 }], nextCursor: "" }).error, [
        { path: "items.0.id", code: "empty" },
        { path: "items.0.label", code: "missing" },
        { path: "items.0.other", code: "unknown" },
        { path: "nextCursor", code: "empty" },
      ]);
    },
  },
  {
    id: "page-missing-types",
    run: () => {
      assert.deepEqual(decodePage({}).error, [
        { path: "items", code: "missing" },
        { path: "nextCursor", code: "missing" },
      ]);
      assert.deepEqual(decodePage({ items: 4, nextCursor: false }).error, [
        { path: "items", code: "type" },
        { path: "nextCursor", code: "type" },
      ]);
    },
  },
  {
    id: "page-frozen",
    run: () => {
      const v = Object.freeze({
        items: Object.freeze([Object.freeze({ id: "a", label: "<tag>" })]),
        nextCursor: null,
      });
      assert.equal(decodePage(v).ok, true);
      assert.equal(v.items[0].label, "<tag>");
    },
  },
  {
    id: "map-failure",
    run: () => {
      let called = false;
      const failed = { ok: false, error: "no" };
      assert.deepEqual(
        mapResult(failed, () => {
          called = true;
        }),
        failed,
      );
      assert.equal(called, false);
      assert.deepEqual(
        mapResult({ ok: true, value: 2 }, (v) => v + 1),
        { ok: true, value: 3 },
      );
    },
  },
];
