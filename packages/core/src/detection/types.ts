import type { IntegrationCategory } from "../categories/integration-category.js";
import type { DetectionConfidence, DetectionEvidence } from "../integrations/definition.js";

export interface DetectedItem {
  id: string;
  name: string;
  category: IntegrationCategory;
  confidence: DetectionConfidence;
  evidence: DetectionEvidence[];
}

export interface DetectedLanguage {
  id: "typescript" | "javascript";
  confidence: DetectionConfidence;
  evidence: DetectionEvidence[];
}

export interface DetectedStack {
  projectRoot: string;
  runtimes: DetectedItem[];
  packageManagers: DetectedItem[];
  frameworks: DetectedItem[];
  language?: DetectedLanguage;
  integrations: DetectedItem[];
  warnings: string[];
}
