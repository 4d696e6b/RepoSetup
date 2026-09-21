import type {
  DetectionConfidence,
  DetectionEvidence,
  DetectionEvidenceKind,
  DetectionResult,
} from "../integrations/definition.js";

export function evidence(
  kind: DetectionEvidenceKind,
  detail: string,
  path?: string,
): DetectionEvidence {
  const item: DetectionEvidence = { kind, detail };
  if (path !== undefined) {
    item.path = path;
  }
  return item;
}

export function notDetected(): DetectionResult {
  return { detected: false, confidence: "possible", evidence: [] };
}

export function detectedResult(
  confidence: DetectionConfidence,
  items: readonly DetectionEvidence[],
): DetectionResult {
  if (items.length === 0) {
    return notDetected();
  }

  return { detected: true, confidence, evidence: [...items] };
}
