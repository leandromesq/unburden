import { formatStatPointSpread } from "@/lib/calc/stat-calc";
import type { BulkArchetype, ImportedSet, PokemonEntry, StatSpread } from "@/lib/types";

export interface ArchetypeConfig {
  archetype: BulkArchetype;
  label?: string;
  evs: StatSpread;
  ivs?: StatSpread;
  nature: string;
  summary: string;
  isCustom?: boolean;
}

function summarize(nature: string, hp: number, def: number, spd: number) {
  return `${nature} | ${hp} HP / ${def} Def / ${spd} SpD`;
}

export function buildCustomSetArchetypeConfig(
  importedSet: ImportedSet,
): ArchetypeConfig {
  return {
    archetype: "mid",
    label: "Custom Set",
    evs: importedSet.evs,
    ivs: importedSet.ivs,
    nature: importedSet.nature,
    summary: `${importedSet.nature} | ${formatStatPointSpread(importedSet.statPoints)}`,
    isCustom: true,
  };
}

export function getArchetypeConfigs(
  defender: PokemonEntry,
  moveCategory: "Physical" | "Special",
  defenderNature?: string,
  defenderInvestment: "auto" | "max_def" | "max_spd" = "auto",
): ArchetypeConfig[] {
  const prioritizeDefense =
    defenderInvestment === "max_def"
      ? true
      : defenderInvestment === "max_spd"
        ? false
        : defenderNature
          ? ["Bold", "Impish", "Relaxed", "Lax"].includes(defenderNature)
          : moveCategory === "Physical"
            ? true
            : moveCategory === "Special"
              ? false
              : defender.baseStats.def >= defender.baseStats.spd;
  const glassNature = defenderNature ?? "Hardy";
  const midNature = defenderNature ?? "Hardy";
  const tankNature = defenderNature ?? (prioritizeDefense ? "Bold" : "Calm");

  return [
    {
      archetype: "glass",
      evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: glassNature,
      summary: summarize(glassNature, 4, 0, 0),
    },
    {
      archetype: "mid",
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 4, spe: 0 },
      nature: midNature,
      summary: summarize(midNature, 252, 4, 4),
    },
    prioritizeDefense
      ? {
          archetype: "tank",
          evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
          nature: tankNature,
          summary: summarize(tankNature, 252, 252, 4),
        }
      : {
          archetype: "tank",
          evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
          nature: tankNature,
          summary: summarize(tankNature, 252, 4, 252),
        },
  ];
}
