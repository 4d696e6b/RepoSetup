import { detectNpmPackage, type DetectionContext, type DetectionResult } from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, removePackages } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { mergeVerify, missingPackage } from "./verify.js";

const SAMPLE_COMPONENT = `export function AccessibleCounter() {
  return (
    <button type="button" onClick={(event) => {
      event.currentTarget.textContent = "Count: 1"
    }}>
      Count: 0
    </button>
  )
}
`;

const SAMPLE_TEST = `// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'

import { AccessibleCounter } from './testing-library-sample'

it('updates the accessible counter after a user click', async () => {
  const user = userEvent.setup()
  render(<AccessibleCounter />)

  await user.click(screen.getByRole('button', { name: 'Count: 0' }))

  expect(screen.getByRole('button', { name: 'Count: 1' })).toBeTruthy()
})
`;

export const testingLibraryIntegration = defineIntegration({
  id: "testing-library",
  name: "Testing Library",
  category: "testing",
  description: "Adds React Testing Library and an accessible interaction test for React + Vite.",
  status: "candidate",
  documentationUrl: "https://testing-library.com/docs/react-testing-library/intro/",
  keywords: ["react", "testing", "accessibility", "vitest"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "vitest" },
      reason: "Testing Library samples run with Vitest.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "Testing Library requires Node.js." };
    }
    if (context.frameworkId !== "react-vite") {
      return {
        supported: false,
        reason: "This release qualifies Testing Library with React + Vite only.",
      };
    }
    return { supported: true };
  },
  detect(context: DetectionContext): Promise<DetectionResult> {
    return detectNpmPackage(context, "@testing-library/react", [
      "src/testing-library-sample.test.tsx",
    ]);
  },
  plan(context) {
    return [
      addPackages(
        context,
        [
          npmPin("@testing-library/react", QUALIFIED_VERSIONS.testingLibraryReact),
          npmPin("@testing-library/dom", QUALIFIED_VERSIONS.testingLibraryDom),
          npmPin("@testing-library/user-event", QUALIFIED_VERSIONS.testingLibraryUserEvent),
          npmPin("jsdom", QUALIFIED_VERSIONS.jsdom),
        ],
        { description: "Install Testing Library interaction-test packages", dev: true },
      ),
      {
        type: "create_file",
        path: "src/testing-library-sample.tsx",
        content: SAMPLE_COMPONENT,
        behavior: "fail_if_exists",
        description: "Add an accessible Testing Library sample component",
      },
      {
        type: "create_file",
        path: "src/testing-library-sample.test.tsx",
        content: SAMPLE_TEST,
        behavior: "fail_if_exists",
        description: "Add a Testing Library interaction test",
      },
    ];
  },
  remove(context) {
    return [
      removePackages(
        context,
        ["@testing-library/react", "@testing-library/dom", "@testing-library/user-event"],
        {
          description: "Remove Testing Library packages",
        },
      ),
      {
        type: "show_message",
        message:
          "Testing Library sample files are preserved so RepoSetup never deletes user-owned source files.",
        description: "Explain safe Testing Library removal",
      },
    ];
  },
  async verify(context) {
    return mergeVerify([
      missingPackage(context, "@testing-library/react"),
      missingPackage(context, "@testing-library/dom"),
      missingPackage(context, "@testing-library/user-event"),
    ]);
  },
});
