import { sealTaskModelCatalog } from "@reposetup/core";
import { PROVIDER_PRICE_REVISION, PROVIDER_TRANSPORT_PROFILES } from "./provider-adapter.js";

/** Official mappings and SDK tests establish transport compatibility, not model capability.
 * Live capability evidence must be reviewed before this catalog can route a managed call. */
export const TASK_MODEL_CATALOG = sealTaskModelCatalog({
  kind: "task_model_catalog",
  schemaVersion: 1,
  profiles: Object.entries(PROVIDER_TRANSPORT_PROFILES).map(([profileId, transport]) => ({
    profileId,
    adapterId: "openai-responses-v1",
    providerId: "openai-responses-v1",
    available: true,
    reviewedAt: "2026-10-07T00:00:00.000Z",
    validUntil: "2026-11-07T00:00:00.000Z",
    qualification: { status: "unconfirmed" },
    efforts: transport.efforts.map((nativeEffortId) => ({
      nativeEffortId,
      minimumOutputTokens: 512,
    })),
    maxContextTokens: 1050000,
    maxOutputTokens: 16384,
    price: {
      catalogRevision: PROVIDER_PRICE_REVISION,
      inputMicrousdPerToken: 1.1 * transport.input,
      outputMicrousdPerToken: 1.1 * transport.output,
    },
  })),
});
