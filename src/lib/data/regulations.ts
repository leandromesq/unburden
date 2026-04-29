import activeRegulationConfig from "@/data/regulations/active.json";
import regulationMA from "@/data/regulations/regulation-m-a.json";
import type { RegulationEntry } from "@/lib/types";

const regulationRegistry: Record<string, RegulationEntry> = {
  "regulation-m-a": regulationMA as RegulationEntry,
};

export const activeRegulation: RegulationEntry =
  regulationRegistry[activeRegulationConfig.regulationId] ??
  regulationRegistry["regulation-m-a"];
