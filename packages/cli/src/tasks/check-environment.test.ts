import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import { createTaskCheckEnvironment } from "./check-environment.js";
import { createDefaultProcessRunner } from "../execution-adapters.js";

const itPosix = it.skipIf(process.platform === "win32");

describe("explicit task check environment", () => {
  itPosix(
    "runs Node without inheriting secrets, proxies, loaders or package-manager settings",
    async () => {
      const environment = createTaskCheckEnvironment({
        executableDirectory: path.dirname(process.execPath),
        homeDirectory: os.tmpdir(),
        temporaryDirectory: os.tmpdir(),
      });
      const marker = "REPOSETUP_TEST_PRIVATE_ENV";
      const previous = process.env[marker];
      process.env[marker] = "private-test-marker";
      try {
        const result = await createDefaultProcessRunner()({
          command: process.execPath,
          args: ["-e", "process.stdout.write(JSON.stringify(process.env))"],
          cwd: os.tmpdir(),
          env: environment,
          timeoutMs: 10000,
        });
        expect(result.exitCode).toBe(0);
        const childEnvironment = JSON.parse(result.stdout) as Record<string, string>;
        // macOS CoreFoundation may inject this runtime variable after spawn.
        if (process.platform === "darwin") delete childEnvironment.__CF_USER_TEXT_ENCODING;
        expect(childEnvironment).toEqual(environment);
        expect(result.stdout).not.toContain(marker);
        expect(environment).not.toHaveProperty("NODE_OPTIONS");
        expect(environment.NODE_DISABLE_COMPILE_CACHE).toBe("1");
        expect(environment).not.toHaveProperty("HTTP_PROXY");
        expect(environment).not.toHaveProperty("npm_config_registry");
        expect(Object.isFrozen(environment)).toBe(true);
      } finally {
        if (previous === undefined) delete process.env[marker];
        else process.env[marker] = previous;
      }
    },
  );
  it("keeps legacy environment inheritance when an installer request omits env", async () => {
    const result = await createDefaultProcessRunner()({
      command: process.execPath,
      args: ["-e", "process.stdout.write(process.env.PATH ?? '')"],
      cwd: os.tmpdir(),
      timeoutMs: 10000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(process.env.PATH);
  });
  it("rejects relative, unnormalized and control-character directory inputs", () => {
    for (const executableDirectory of ["node", "/tmp/../bin", "/tmp\n/bin"]) {
      expect(() =>
        createTaskCheckEnvironment({
          executableDirectory,
          homeDirectory: os.tmpdir(),
          temporaryDirectory: os.tmpdir(),
        }),
      ).toThrow();
    }
  });
});
