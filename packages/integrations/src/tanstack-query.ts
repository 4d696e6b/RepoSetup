import {
  detectNpmPackage,
  notDetected,
  type DetectionContext,
  type DetectionResult,
} from "@reposetup/core";

import { defineIntegration, VERIFIED_AT } from "./define.js";
import { addPackages, removePackages } from "./operations.js";
import { QUALIFIED_VERSIONS, npmPin } from "./qualified-versions.js";
import { mergeVerify, missingPackage } from "./verify.js";

const PROVIDER = `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

const queryClient = new QueryClient()

export function RepoSetupQueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
`;

const SAMPLE = `import { useQuery } from '@tanstack/react-query'

type Greeting = { message: string }

async function fetchGreeting(): Promise<Greeting> {
  const response = await fetch('/api/greeting')
  if (!response.ok) throw new Error('Unable to load greeting')
  return response.json() as Promise<Greeting>
}

export function GreetingQuery() {
  const query = useQuery({ queryKey: ['greeting'], queryFn: fetchGreeting })

  if (query.isPending) return <p>Loading greeting…</p>
  if (query.isError) return <p role="alert">Unable to load greeting</p>
  return <p>{query.data.message}</p>
}
`;

const SAMPLE_TEST = `// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { GreetingQuery } from './tanstack-query-sample'

it('renders a response fetched through TanStack Query', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Hello' }), { status: 200 })))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(<QueryClientProvider client={client}><GreetingQuery /></QueryClientProvider>)

  expect(await screen.findByText('Hello')).toBeTruthy()
})
`;

export const tanstackQueryIntegration = defineIntegration({
  id: "tanstack-query",
  name: "TanStack Query",
  category: "utility",
  description: "Adds a React + Vite QueryClient provider and a tested server-state query example.",
  status: "candidate",
  documentationUrl: "https://tanstack.com/query/latest/docs/framework/react/overview",
  keywords: ["react", "query", "cache", "server-state"],
  verification: { verifiedAt: VERIFIED_AT },
  addable: true,
  removable: true,
  requirements: [
    {
      kind: "requires",
      target: { type: "integration", id: "testing-library" },
      reason: "The TanStack Query sample uses Testing Library for its browser-level assertion.",
    },
  ],
  supports(context) {
    if (context.runtimeId !== "node") {
      return { supported: false, reason: "TanStack Query requires Node.js." };
    }
    if (context.frameworkId !== "react-vite") {
      return {
        supported: false,
        reason: "This release qualifies TanStack Query with React + Vite only.",
      };
    }
    return { supported: true };
  },
  async detect(context: DetectionContext): Promise<DetectionResult> {
    const result = await detectNpmPackage(context, "@tanstack/react-query");
    return result.detected && (await context.files.exists("src/reposetup-query-provider.tsx"))
      ? result
      : notDetected();
  },
  plan(context) {
    return [
      addPackages(
        context,
        [npmPin("@tanstack/react-query", QUALIFIED_VERSIONS.tanstackReactQuery)],
        {
          description: "Install TanStack Query",
        },
      ),
      {
        type: "create_file",
        path: "src/reposetup-query-provider.tsx",
        content: PROVIDER,
        behavior: "fail_if_exists",
        description: "Add a TanStack Query provider",
      },
      {
        type: "create_file",
        path: "src/tanstack-query-sample.tsx",
        content: SAMPLE,
        behavior: "fail_if_exists",
        description: "Add a TanStack Query request sample",
      },
      {
        type: "create_file",
        path: "src/tanstack-query-sample.test.tsx",
        content: SAMPLE_TEST,
        behavior: "fail_if_exists",
        description: "Add a TanStack Query response test",
      },
      {
        type: "show_message",
        message:
          "Wrap the React root with RepoSetupQueryProvider before rendering components that use TanStack Query.",
        description: "Explain how to use the generated TanStack Query provider",
      },
    ];
  },
  remove(context) {
    return [
      removePackages(context, ["@tanstack/react-query"], { description: "Remove TanStack Query" }),
      {
        type: "show_message",
        message:
          "TanStack Query provider and sample files are preserved so RepoSetup never deletes user-owned source files.",
        description: "Explain safe TanStack Query removal",
      },
    ];
  },
  async verify(context) {
    return mergeVerify([missingPackage(context, "@tanstack/react-query")]);
  },
});
