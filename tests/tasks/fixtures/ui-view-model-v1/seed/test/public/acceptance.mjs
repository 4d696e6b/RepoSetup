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
    id: "public-example",
    run: () => {
      assert.deepEqual(
        view({ filter: "done" }).rows.map((i) => i.id),
        ["a"],
      );
    },
  },
  { id: "public-selection", run: () => assert.equal(view({ selectedId: "b" }).selectedId, "b") },
  {
    id: "public-loading",
    run: () => assert.equal(view({ items: [], loading: true }).state, "loading"),
  },
];
