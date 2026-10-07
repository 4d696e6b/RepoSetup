import assert from "node:assert/strict";
import { decodePage } from "../../src/page.js";
export const cases = [
  {
    id: "compat-valid-page",
    run: () => assert.equal(decodePage({ items: [], nextCursor: null }).ok, true),
  },
];
