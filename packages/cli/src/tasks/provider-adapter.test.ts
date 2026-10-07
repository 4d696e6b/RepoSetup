import { describe, it, expect, vi } from "vitest";
import { taskContentHash, type TaskParseResult } from "@reposetup/core";
import { createOpenAITaskProvider, boundedProviderFetch } from "./provider-adapter.js";
import { providerWireSchema } from "./provider-wire.js";

const hash = `sha256:${"a".repeat(64)}`;
const identity = {
  kind: "task_provider_reply",
  schemaVersion: 1,
  planId: hash,
  taskId: "task",
  attemptId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/task/1",
  inputRevision: hash,
};
const document = { ...identity, reply: { type: "no_change", rationale: "Already implemented." } };
function data<T>(r: TaskParseResult<T>): T {
  if (!r.success) throw new Error(r.error.code);
  return r.data;
}
function response(payload: unknown = document) {
  return {
    id: "resp_fake",
    model: "gpt-6-luna",
    reasoning: { effort: "low" },
    service_tier: "default",
    status: "completed",
    error: null,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
      input_tokens_details: { cached_tokens: 3 },
      output_tokens_details: { reasoning_tokens: 4 },
    },
    output: [
      {
        type: "message",
        status: "completed",
        role: "assistant",
        content: [{ type: "output_text", text: JSON.stringify(payload), annotations: [] }],
      },
    ],
  };
}
function setup(body: unknown = response(), status = 200) {
  const transport = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "x-request-id": "req_fake" },
      }),
  );
  const provider = data(
    createOpenAITaskProvider({
      model: "gpt-6-luna",
      effort: "low",
      environment: {
        OPENAI_API_KEY: "fake-test-key",
        OPENAI_BASE_URL: "https://evil.invalid",
        OPENAI_LOG: "debug",
      },
      transport,
    }),
  );
  const request = data(
    provider.prepare({
      purpose: "coding",
      document: { identity },
      maxOutputTokens: 1024,
      timeoutMs: 1000,
    }),
  );
  return { provider, request, transport };
}
describe("tool-free Responses SDK boundary", () => {
  it("rejects credential echo and aborts an in-flight request without retrying", async () => {
    const echo = setup(
      response({ ...identity, reply: { type: "no_change", rationale: "fake-test-key" } }),
    );
    expect((await echo.provider.dispatch(echo.request)).outcome).toBe("invalid");
    const controller = new AbortController();
    const transport = vi.fn<typeof fetch>(async (_url, options) => {
      controller.abort();
      throw options?.signal?.reason ?? new Error("aborted");
    });
    const provider = data(
      createOpenAITaskProvider({
        model: "gpt-6-luna",
        effort: "low",
        environment: { OPENAI_API_KEY: "fake-test-key" },
        transport,
      }),
    );
    const request = data(
      provider.prepare({
        purpose: "coding",
        document: { identity },
        maxOutputTokens: 1024,
        timeoutMs: 1000,
      }),
    );
    expect((await provider.dispatch(request, controller.signal)).outcome).toBe("cancelled");
    expect(transport).toHaveBeenCalledOnce();
  });
  it("uses the real SDK with fixed transport, strict schema, separate effort, no state/tools or retries", async () => {
    const f = setup();
    const output = await f.provider.dispatch(f.request);
    expect(output).toMatchObject({
      outcome: "completed",
      document,
      effectiveConfiguration: { provenance: "provider_reported" },
      usage: {
        inputTokens: { provenance: "reported", value: 10 },
        outputTokens: { value: 20 },
        reasoningTokens: { value: 4 },
        totalTokens: { value: 30 },
        costMicrousd: { provenance: "estimated" },
        providerCallId: "req_fake",
      },
    });
    expect(f.transport).toHaveBeenCalledTimes(1);
    const [url, options] = f.transport.mock.calls[0]!;
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    expect(options?.redirect).toBe("error");
    const body = JSON.parse(options!.body as string);
    expect(body).toMatchObject({
      model: "gpt-6-luna",
      reasoning: { effort: "low" },
      store: false,
      background: false,
      stream: false,
      tools: [],
      tool_choice: "none",
      service_tier: "default",
      text: { format: { type: "json_schema", strict: true } },
    });
    expect(body.previous_response_id).toBeUndefined();
    expect(body.conversation).toBeUndefined();
    expect((await f.provider.dispatch(f.request)).outcome).toBe("invalid");
    expect(f.transport).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 429, 500])(
    "does not retry HTTP %s or expose error contents",
    async (status) => {
      const f = setup(
        { error: { message: "fake-test-key sensitive raw body", type: "server_error" } },
        status,
      );
      const output = await f.provider.dispatch(f.request);
      expect(output.outcome).toBe("failed");
      expect(output.httpStatus).toBe(status);
      expect(output.usage.inputTokens.provenance).toBe("unknown");
      expect(JSON.stringify(output)).not.toContain("fake-test-key");
      expect(f.transport).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["incomplete", "failed", "queued", "cancelled"])(
    "never parses %s content as a proposal",
    async (status) => {
      const f = setup({ ...response(), status });
      const output = await f.provider.dispatch(f.request);
      expect(output.outcome).toBe(status === "incomplete" ? "incomplete" : "failed");
      expect(output.document).toBeNull();
      expect(output.usage.outputTokens).toMatchObject({ provenance: "reported", value: 20 });
    },
  );
  it("rejects tool calls, malformed/extra fields, refusals and duplicate keys", async () => {
    for (const output of [
      [{ type: "function_call", name: "shell", arguments: "rm -rf ." }],
      [{ ...response().output[0], content: [{ type: "refusal", refusal: "No." }] }],
      [
        {
          ...response().output[0],
          content: [
            { type: "output_text", text: JSON.stringify({ ...document, command: "echo pwn" }) },
          ],
        },
      ],
      [
        {
          ...response().output[0],
          content: [
            {
              type: "output_text",
              text: '{"kind":"task_provider_reply","kind":"task_provider_reply"}',
            },
          ],
        },
      ],
    ]) {
      const f = setup({ ...response(), output });
      expect((await f.provider.dispatch(f.request)).outcome).not.toBe("completed");
    }
  });
  it("derives the digest for a strict text ChangeSet, preserving model identities", async () => {
    const cs = {
      kind: "change_set",
      schemaVersion: 1,
      planId: hash,
      taskId: "task",
      attemptId: identity.attemptId,
      inputRevision: hash,
      changes: [
        {
          type: "create_text",
          path: "src/a.ts",
          expectedState: "absent",
          content: "export const a = 1;",
        },
      ],
    };
    const f = setup(response({ ...identity, reply: { type: "change_set", changeSet: cs } }));
    expect((await f.provider.dispatch(f.request)).document).toMatchObject({
      reply: { changeSet: { changeSetId: taskContentHash(cs) } },
    });
  });
  it("bounds body allocation and cancels a rejected response stream", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(1048577));
      },
      cancel,
    });
    const bounded = boundedProviderFetch(async () => new Response(stream));
    await expect(
      bounded("https://api.openai.com/v1/responses", { method: "POST" }),
    ).rejects.toThrow("bound");
    expect(cancel).toHaveBeenCalledOnce();
    await expect(bounded("https://evil.invalid", { method: "POST" })).rejects.toThrow("endpoint");
  });
  it("pre-cancellation performs no network request and missing effective fields stay unknown", async () => {
    const f = setup({ ...response(), model: undefined, reasoning: undefined });
    expect((await f.provider.dispatch(f.request)).effectiveConfiguration).toEqual({
      provenance: "unknown",
    });
    const g = setup();
    expect((await g.provider.dispatch(g.request, AbortSignal.abort())).outcome).toBe("cancelled");
    expect(g.transport).not.toHaveBeenCalled();
  });
  it("requires environment credentials, exact documented model/effort and bounded input", () => {
    expect(
      createOpenAITaskProvider({ model: "gpt-6-luna", effort: "low", environment: {} }),
    ).toMatchObject({ error: { code: "TASK_PROVIDER_CREDENTIAL_MISSING" } });
    expect(
      createOpenAITaskProvider({ model: "gpt-6.1-sol", effort: "none", environment: {} }),
    ).toMatchObject({ error: { code: "TASK_PROVIDER_CONFIGURATION_UNSUPPORTED" } });
    const f = setup();
    expect(
      f.provider.prepare({
        purpose: "coding",
        document: { huge: "x".repeat(196608) },
        maxOutputTokens: 1024,
        timeoutMs: 1000,
      }).success,
    ).toBe(false);
    for (const purpose of ["coding", "decomposition"] as const) {
      const schema = providerWireSchema(purpose);
      expect(schema.type).toBe("object");
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(Object.keys(schema.properties!));
    }
  });
});
