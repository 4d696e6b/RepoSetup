import assert from "node:assert/strict";
import { handleRequest } from "../../src/handler.js";
const good = { list: async () => ({ ok: true, items: [{ id: "a" }], nextCursor: null }) };
const call = (query = {}, extra = {}, repo = good) =>
  handleRequest({ method: "GET", path: "/items", query, ...extra }, repo);
export const cases = [
  { id: "compat-default", run: async () => assert.equal((await call()).status, 200) },
];
