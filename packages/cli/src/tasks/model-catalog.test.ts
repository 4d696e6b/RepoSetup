import { describe, expect, it } from "vitest";
import { validateTaskModelCatalog } from "@reposetup/core";
import { TASK_MODEL_CATALOG } from "./model-catalog.js";
import { createOpenAITaskProvider } from "./provider-adapter.js";

describe("dated concrete provider catalog", () => {
  it("keeps documented transport mappings unconfirmed for capability routing", () => {
    expect(validateTaskModelCatalog(TASK_MODEL_CATALOG).success).toBe(true);
    expect(TASK_MODEL_CATALOG.profiles.every((p) => p.qualification.status === "unconfirmed")).toBe(
      true,
    );
    expect(TASK_MODEL_CATALOG.profiles.map((p) => p.profileId)).toEqual([
      "gpt-6-luna",
      "gpt-6.1-sol",
      "gpt-6-astra",
    ]);
  });
  it("maps each reviewed effort through the actual pinned SDK without credentials or dispatch", () => {
    for (const profile of TASK_MODEL_CATALOG.profiles)
      for (const effort of profile.efforts) {
        const provider = createOpenAITaskProvider({
          model: profile.profileId,
          effort: effort.nativeEffortId,
          environment: { OPENAI_API_KEY: "offline-test-only" },
          transport: async () => {
            throw new Error("No HTTP dispatch in catalog qualification");
          },
        });
        expect(provider.success).toBe(true);
        if (!provider.success) continue;
        const prepared = provider.data.prepare({
          purpose: "coding",
          document: { identity: "fixture" },
          maxOutputTokens: 4096,
          timeoutMs: 100,
        });
        expect(prepared.success).toBe(true);
        if (prepared.success)
          expect(JSON.parse(prepared.data.payload)).toMatchObject({
            model: profile.profileId,
            reasoning: { effort: effort.nativeEffortId },
            store: false,
            tools: [],
          });
      }
  });
});
