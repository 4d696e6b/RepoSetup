import assert from "node:assert/strict";
import { handleRequest } from "../../src/handler.js";
const good = { list: async () => ({ ok: true, items: [{ id: "a" }], nextCursor: null }) };
const call = (query = {}, extra = {}, repo = good) =>
  handleRequest({ method: "GET", path: "/items", query, ...extra }, repo);
export const cases = [
  {
    id: "api-default",
    run: async () => {
      assert.deepEqual(await call(), {
        status: 200,
        body: { items: [{ id: "a" }], nextCursor: null },
      });
    },
  },
  {
    id: "api-route",
    run: async () => {
      let n = 0;
      const r = {
        list: async () => {
          n++;
          throw Error("private");
        },
      };
      assert.equal((await call({}, { path: "/no", method: "POST" }, r)).status, 404);
      assert.equal((await call({}, { method: "POST" }, r)).status, 405);
      assert.equal(n, 0);
    },
  },
  {
    id: "api-numbers",
    run: async () => {
      for (const limit of ["0", "101", "-1", "+1", "1.2", "1e2", " 1", "1 ", "", ["1"]])
        assert.equal((await call({ limit })).status, 400);
      for (const limit of ["1", "100", "001"]) assert.equal((await call({ limit })).status, 200);
    },
  },
  {
    id: "api-cursor",
    run: async () => {
      for (const cursor of ["", ["a"]]) assert.equal((await call({ cursor })).status, 400);
      assert.equal((await call({ unknown: "a" })).status, 400);
    },
  },
  {
    id: "api-exact-call",
    run: async () => {
      const calls = [];
      await call(
        { limit: "3", cursor: "../opaque" },
        {},
        {
          list: async (q) => {
            calls.push(q);
            return { ok: true, items: [], nextCursor: "next" };
          },
        },
      );
      assert.deepEqual(calls, [{ limit: 3, cursor: "../opaque" }]);
    },
  },
  {
    id: "api-errors",
    run: async () => {
      assert.deepEqual(
        await call({}, {}, { list: async () => ({ ok: false, error: "invalid_cursor" }) }),
        { status: 400, body: { error: "invalid_cursor" } },
      );
      assert.deepEqual(
        await call({}, {}, { list: async () => ({ ok: false, error: "unavailable" }) }),
        { status: 500, body: { error: "internal_error" } },
      );
      assert.deepEqual(
        await call(
          {},
          {},
          {
            list: async () => {
              throw Error("FIXTURE_PRIVATE_MARKER");
            },
          },
        ),
        { status: 500, body: { error: "internal_error" } },
      );
    },
  },
  {
    id: "api-frozen",
    run: async () => {
      const query = Object.freeze({ limit: "2" });
      await call(query);
      assert.deepEqual(query, { limit: "2" });
    },
  },
];
