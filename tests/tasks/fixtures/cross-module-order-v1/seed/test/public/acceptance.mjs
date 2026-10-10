import assert from "node:assert/strict";
import { calculateTotal } from "../../src/totals.js";
import { presentOrder } from "../../src/presenter.js";
import { legacyTotal } from "../../src/legacy-consumer.js";
const line = (extra = {}) => ({ sku: "a", quantity: 1, unitCents: 101, ...extra });
export const cases = [
  {
    id: "public-example",
    run: () => {
      assert.deepEqual(legacyTotal(), { ok: true, value: 100 });
      assert.deepEqual(presentOrder([line()], 0), { totalCents: 101, formattedTotal: "1.01" });
    },
  },
  {
    id: "public-discount",
    run: () =>
      assert.deepEqual(calculateTotal([line({ unitCents: 200 })], 5000), { ok: true, value: 100 }),
  },
];
