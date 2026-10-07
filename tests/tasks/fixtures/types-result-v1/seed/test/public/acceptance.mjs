import assert from "node:assert/strict";
import { decodePage } from "../../src/page.js";
import { mapResult } from "../../src/result.js";
export const cases = [
  {
    id: "public-example",
    run: () => {
      assert.deepEqual(decodePage({ items: [], nextCursor: null, extra: 1 }), {
        ok: false,
        error: [{ path: "extra", code: "unknown" }],
      });
    },
  },
  {
    id: "public-valid-page",
    run: () =>
      assert.deepEqual(decodePage({ items: [{ id: "one", label: "One" }], nextCursor: "opaque" }), {
        ok: true,
        value: { items: [{ id: "one", label: "One" }], nextCursor: "opaque" },
      }),
  },
  {
    id: "public-invalid-item",
    run: () =>
      assert.equal(decodePage({ items: [{ id: "", label: "One" }], nextCursor: null }).ok, false),
  },
  {
    id: "public-map-failure",
    run: () =>
      assert.deepEqual(
        mapResult({ ok: false, error: "bad" }, () => {
          throw new Error("must not map failure");
        }),
        { ok: false, error: "bad" },
      ),
  },
];
