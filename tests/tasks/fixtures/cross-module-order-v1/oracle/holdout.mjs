import assert from "node:assert/strict";
import { calculateTotal } from "../../src/totals.js";
import { presentOrder } from "../../src/presenter.js";
import { legacyTotal } from "../../src/legacy-consumer.js";
const line = (extra = {}) => ({ sku: "a", quantity: 1, unitCents: 101, ...extra });
export const cases = [
  {
    id: "cross-default",
    run: () => {
      assert.deepEqual(legacyTotal(), { ok: true, value: 100 });
      assert.deepEqual(presentOrder([line()], 0), { totalCents: 101, formattedTotal: "1.01" });
    },
  },
  {
    id: "cross-invalid-line",
    run: () => {
      for (const extra of [
        { sku: "" },
        { quantity: 0 },
        { quantity: 1000 },
        { quantity: 1.5 },
        { unitCents: -1 },
        { unitCents: 1.5 },
        { unitCents: Number.MAX_SAFE_INTEGER + 1 },
      ])
        assert.equal(calculateTotal([line(extra)], 0).error.code, "invalid_line");
    },
  },
  {
    id: "cross-discount",
    run: () => {
      for (const n of [-1, 10001, 1.5])
        assert.equal(calculateTotal([line()], n).error.code, "invalid_discount");
      assert.deepEqual(calculateTotal([], 0), { ok: true, value: 0 });
      assert.deepEqual(calculateTotal([line()], 10000), { ok: true, value: 0 });
    },
  },
  {
    id: "cross-aggregate-rounding",
    run: () => {
      assert.deepEqual(calculateTotal([line({ unitCents: 1 })], 5000), { ok: true, value: 0 });
      assert.deepEqual(calculateTotal([line({ unitCents: 1 }), line({ unitCents: 1 })], 5000), {
        ok: true,
        value: 1,
      });
    },
  },
  {
    id: "cross-overflow",
    run: () => {
      assert.equal(
        calculateTotal([line({ quantity: 2, unitCents: Number.MAX_SAFE_INTEGER })], 0).error.code,
        "overflow",
      );
      assert.equal(
        calculateTotal([line({ unitCents: Number.MAX_SAFE_INTEGER }), line()], 0).error.code,
        "overflow",
      );
      assert.equal(calculateTotal([line({ unitCents: Number.MAX_SAFE_INTEGER })], 1).ok, true);
    },
  },
  {
    id: "cross-view",
    run: () => {
      assert.deepEqual(presentOrder([], 0), { totalCents: 0, formattedTotal: "0.00" });
      assert.deepEqual(presentOrder([line({ quantity: 0 })], 0), { error: "invalid_line" });
    },
  },
  {
    id: "cross-frozen",
    run: () => {
      const lines = Object.freeze([Object.freeze(line())]);
      assert.deepEqual(calculateTotal(lines, 0), { ok: true, value: 101 });
    },
  },
];
