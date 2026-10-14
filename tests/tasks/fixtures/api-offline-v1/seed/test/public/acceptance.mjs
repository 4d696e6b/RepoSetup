import assert from "node:assert/strict";
import { handleRequest } from "../../src/handler.js";
const good = { list: async () => ({ ok: true, items: [{ id: "a" }], nextCursor: null }) };
const call = (query = {}, extra = {}, repo = good) =>
  handleRequest({ method: "GET", path: "/items", query, ...extra }, repo);
export const cases = [
  {
    id: "public-example",
    run: async () => {
      assert.deepEqual(await call(), {
        status: 200,
        body: { items: [{ id: "a" }], nextCursor: null },
      });
    },
  },
  {
    id: "public-limit",
    run: async () => {
      let observed;
      const repo = {
        list: async (input) => {
          observed = input;
          return { ok: true, items: [], nextCursor: null };
        },
      };
      assert.equal((await call({ limit: "7" }, {}, repo)).status, 200);
      assert.equal(observed.limit, 7);
    },
  },
  {
    id: "public-invalid-limit",
    run: async () => assert.equal((await call({ limit: "7tail" })).status, 400),
  },
];
