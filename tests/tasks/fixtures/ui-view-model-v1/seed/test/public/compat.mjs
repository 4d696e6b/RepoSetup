import assert from "node:assert/strict";
import { buildListView } from "../../src/view-model.js";
const items = [
  { id: "b", label: "Alpha", status: "open" },
  { id: "a", label: "alpha", status: "done" },
  { id: "c", label: "<tag>", status: "open" },
];
const view = (extra = {}) =>
  buildListView({ items, search: "", filter: "all", selectedId: null, loading: false, ...extra });
export const cases = [{ id: "compat-all", run: () => assert.equal(view().rows.length, 3) }];
