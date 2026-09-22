import { describe, expect, it } from "vitest";

import { createDetectionContext } from "./context.js";
import { detectEcosystem } from "./ecosystem.js";
import { createMemoryDetectionFs } from "./filesystem.js";

describe("detectEcosystem", () => {
  it("detects a pnpm Node project from its lockfile and does not infer npm", async () => {
    const context = await createDetectionContext(
      "/virtual/pnpm-app",
      createMemoryDetectionFs({
        "package.json": JSON.stringify({ name: "app" }),
        "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.runtimes.map((item) => item.id)).toEqual(["node"]);
    expect(detected.runtimes[0]?.confidence).toBe("certain");
    expect(detected.packageManagers.map((item) => item.id)).toEqual(["pnpm"]);
    expect(detected.packageManagers[0]?.confidence).toBe("certain");
    expect(detected.warnings).toEqual([]);
  });

  it("detects npm from package-lock.json", async () => {
    const context = await createDetectionContext(
      "/virtual/npm-app",
      createMemoryDetectionFs({
        "package.json": JSON.stringify({ name: "app" }),
        "package-lock.json": JSON.stringify({ lockfileVersion: 3 }),
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.packageManagers.map((item) => item.id)).toEqual(["npm"]);
  });

  it("does not infer a Node package manager from package.json alone", async () => {
    const context = await createDetectionContext(
      "/virtual/bare-node",
      createMemoryDetectionFs({
        "package.json": JSON.stringify({ name: "app" }),
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.runtimes.map((item) => item.id)).toEqual(["node"]);
    expect(detected.packageManagers).toEqual([]);
  });

  it("reports both lockfiles when npm and pnpm evidence coexist", async () => {
    const context = await createDetectionContext(
      "/virtual/mixed-lockfiles",
      createMemoryDetectionFs({
        "package.json": JSON.stringify({ name: "app" }),
        "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
        "package-lock.json": JSON.stringify({ lockfileVersion: 3 }),
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.packageManagers.map((item) => item.id)).toEqual(["npm", "pnpm"]);
    expect(detected.packageManagers.every((item) => item.confidence === "certain")).toBe(true);
  });

  it("detects Python and uv from uv.lock", async () => {
    const context = await createDetectionContext(
      "/virtual/uv-app",
      createMemoryDetectionFs({
        "pyproject.toml": "[project]\nname = 'app'\n",
        "uv.lock": "version = 1\n",
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.runtimes.map((item) => item.id)).toEqual(["python"]);
    expect(detected.packageManagers.map((item) => item.id)).toEqual(["uv"]);
    expect(detected.packageManagers[0]?.confidence).toBe("certain");
  });

  it("detects pip as likely from requirements.txt when no uv.lock is present", async () => {
    const context = await createDetectionContext(
      "/virtual/pip-app",
      createMemoryDetectionFs({
        "requirements.txt": "flask==3.0.0\n",
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.runtimes.map((item) => item.id)).toEqual(["python"]);
    expect(detected.packageManagers).toEqual([
      expect.objectContaining({ id: "pip", confidence: "likely" }),
    ]);
  });

  it("does not select pip when uv.lock identifies the manager", async () => {
    const context = await createDetectionContext(
      "/virtual/uv-and-requirements",
      createMemoryDetectionFs({
        "pyproject.toml": "[project]\nname = 'app'\n",
        "uv.lock": "version = 1\n",
        "requirements.txt": "flask==3.0.0\n",
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.packageManagers.map((item) => item.id)).toEqual(["uv"]);
  });

  it("records yarn.lock as a warning instead of selecting Yarn or guessing npm", async () => {
    const context = await createDetectionContext(
      "/virtual/yarn-app",
      createMemoryDetectionFs({
        "package.json": JSON.stringify({ name: "app" }),
        "yarn.lock": "# yarn\n",
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.packageManagers).toEqual([]);
    expect(detected.warnings.some((warning) => warning.includes("yarn.lock"))).toBe(true);
  });

  it("detects TypeScript from tsconfig.json", async () => {
    const context = await createDetectionContext(
      "/virtual/ts-app",
      createMemoryDetectionFs({
        "package.json": JSON.stringify({ name: "app" }),
        "tsconfig.json": "{}\n",
      }),
    );

    const detected = await detectEcosystem(context);
    expect(detected.language).toEqual(
      expect.objectContaining({ id: "typescript", confidence: "certain" }),
    );
  });
});
