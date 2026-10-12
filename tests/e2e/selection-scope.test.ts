import { expect, it } from "vitest";
import { journeys, selectionJourneys } from "./selection-matrix.js";

it("retains full qualification and makes local runtime exclusions explicit", () => {
  expect(selectionJourneys(undefined, true)).toBe(journeys);
  expect(selectionJourneys("node")).toHaveLength(30);
  expect(selectionJourneys("python")).toHaveLength(15);
  expect(
    selectionJourneys("node").every((journey) => journey.context.context.runtimeId === "node"),
  ).toBe(true);
  expect(() => selectionJourneys("node", true)).toThrow("cannot narrow");
  expect(() => selectionJourneys("python", true)).toThrow("cannot narrow");
  expect(() => selectionJourneys("unknown")).toThrow("must be node or python");
});
