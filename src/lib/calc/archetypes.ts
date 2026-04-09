import type { BulkArchetype, PokemonEntry } from "@/lib/types";

export interface ArchetypeConfig {
  archetype: BulkArchetype;
  evs: {
    hp: number;
    def: number;
    spd: number;
  };
  nature: string;
  summary: string;
}

function summarize(nature: string, hp: number, def: number, spd: number) {
  return `${nature} | ${hp} HP / ${def} Def / ${spd} SpD`;
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
      evs: { hp: 4, def: 0, spd: 0 },
      nature: glassNature,
      summary: summarize(glassNature, 4, 0, 0),
    },
    {
      archetype: "mid",
      evs: { hp: 252, def: 4, spd: 4 },
      nature: midNature,
      summary: summarize(midNature, 252, 4, 4),
    },
    prioritizeDefense
      ? {
          archetype: "tank",
          evs: { hp: 252, def: 252, spd: 4 },
          nature: tankNature,
          summary: summarize(tankNature, 252, 252, 4),
        }
      : {
          archetype: "tank",
          evs: { hp: 252, def: 4, spd: 252 },
          nature: tankNature,
          summary: summarize(tankNature, 252, 4, 252),
        },
  ];
}
