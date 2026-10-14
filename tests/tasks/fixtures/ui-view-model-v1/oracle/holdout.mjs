import assert from "node:assert/strict";
import { buildListView } from "../../src/view-model.js";
const items = [
  { id: "b", label: "Alpha", status: "open" },
  { id: "a", label: "alpha", status: "done" },
  { id: "c", label: "<tag>", status: "open" },
];
const view = (extra = {}) =>
  buildListView({ items, search: "", filter: "all", selectedId: null, loading: false, ...extra });
export const cases = [
  {
    id: "ui-filter",
    run: () => {
      assert.deepEqual(
        view({ filter: "done" }).rows.map((i) => i.id),
        ["a"],
      );
    },
  },
  {
    id: "ui-trim",
    run: () => {
      assert.deepEqual(
        view({ search: " ALPHA " }).rows.map((i) => i.id),
        ["a", "b"],
      );
    },
  },
  {
    id: "ui-ties",
    run: () => {
      assert.deepEqual(
        view().rows.map((i) => i.id),
        ["c", "a", "b"],
      );
    },
  },
  {
    id: "ui-totals",
    run: () => {
      assert.equal(view({ filter: "done" }).total, 3);
      assert.equal(view({ search: "absent" }).openCount, 2);
      assert.equal(view().doneCount, 1);
    },
  },
  {
    id: "ui-state",
    run: () => {
      assert.equal(view({ items: [], loading: true }).state, "loading");
      assert.equal(view({ search: "absent" }).state, "empty");
      assert.equal(view().state, "ready");
    },
  },
  {
    id: "ui-selection",
    run: () => {
      assert.equal(view({ selectedId: "a" }).selectedId, "a");
      assert.equal(view({ selectedId: "a", filter: "open" }).selectedId, null);
      assert.equal(view({ selectedId: "missing" }).selectedId, null);
    },
  },
  {
    id: "ui-frozen",
    run: () => {
      const frozen = Object.freeze(items.map((i) => Object.freeze({ ...i })));
      assert.deepEqual(view({ items: frozen }), view({ items: frozen }));
      assert.equal(frozen[0].id, "b");
      assert.equal(view().rows[0].label, "<tag>");
    },
  },
];
