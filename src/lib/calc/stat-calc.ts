import type { StatSpread } from "@/lib/types";

/** Maps nature name → { stat: multiplier } for boosted/lowered stats only */
const NATURE_MODIFIERS: Record<string, Partial<Record<keyof Omit<StatSpread, "hp">, number>>> = {
  Hardy: {}, Docile: {}, Serious: {}, Bashful: {}, Quirky: {},
  Lonely:  { atk: 1.1, def: 0.9 },
  Brave:   { atk: 1.1, spe: 0.9 },
  Adamant: { atk: 1.1, spa: 0.9 },
  Naughty: { atk: 1.1, spd: 0.9 },
  Bold:    { def: 1.1, atk: 0.9 },
  Relaxed: { def: 1.1, spe: 0.9 },
  Impish:  { def: 1.1, spa: 0.9 },
  Lax:     { def: 1.1, spd: 0.9 },
  Timid:   { spe: 1.1, atk: 0.9 },
  Hasty:   { spe: 1.1, def: 0.9 },
  Jolly:   { spe: 1.1, spa: 0.9 },
  Naive:   { spe: 1.1, spd: 0.9 },
  Modest:  { spa: 1.1, atk: 0.9 },
  Mild:    { spa: 1.1, def: 0.9 },
  Quiet:   { spa: 1.1, spe: 0.9 },
  Rash:    { spa: 1.1, spd: 0.9 },
  Calm:    { spd: 1.1, atk: 0.9 },
  Gentle:  { spd: 1.1, def: 0.9 },
  Sassy:   { spd: 1.1, spe: 0.9 },
  Careful: { spd: 1.1, spa: 0.9 },
};

function getNatureMult(nature: string, stat: keyof Omit<StatSpread, "hp">): number {
  return NATURE_MODIFIERS[nature]?.[stat] ?? 1.0;
}

function calcHp(base: number, ev: number, iv: number, level: number): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

function calcStat(
  base: number,
  ev: number,
  iv: number,
  natureMult: number,
  level: number,
): number {
  return Math.floor(
    (Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * natureMult,
  );
}

export interface ComputedStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/**
 * Compute actual stat values from base stats + EVs + IVs + nature + level.
 */
export function computeStats(
  baseStats: StatSpread,
  evs: StatSpread,
  ivs: StatSpread,
  nature: string,
  level: number,
): ComputedStats {
  return {
    hp:  calcHp(baseStats.hp,  evs.hp,  ivs.hp,  level),
    atk: calcStat(baseStats.atk, evs.atk, ivs.atk, getNatureMult(nature, "atk"), level),
    def: calcStat(baseStats.def, evs.def, ivs.def, getNatureMult(nature, "def"), level),
    spa: calcStat(baseStats.spa, evs.spa, ivs.spa, getNatureMult(nature, "spa"), level),
    spd: calcStat(baseStats.spd, evs.spd, ivs.spd, getNatureMult(nature, "spd"), level),
    spe: calcStat(baseStats.spe, evs.spe, ivs.spe, getNatureMult(nature, "spe"), level),
  };
}

/**
 * Returns the stage multiplier for a given stage value (-6 to +6).
 * Positive: (2+stage)/2, Negative: 2/(2-stage)
 */
export function stageMultiplier(stage: number): number {
  if (stage === 0) return 1;
  if (stage > 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

/**
 * Apply a stage boost to a stat value and return the boosted value.
 */
export function applyStage(stat: number, stage: number): number {
  if (stage === 0) return stat;
  return Math.floor(stat * stageMultiplier(stage));
}

/**
 * Format the EV spread compactly, e.g. "252 SpA / 4 SpD / 252 Spe"
 * Omits stats with 0 EVs.
 */
export function formatEVSpread(evs: StatSpread): string {
  const labels: Array<[keyof StatSpread, string]> = [
    ["hp", "HP"],
    ["atk", "Atk"],
    ["def", "Def"],
    ["spa", "SpA"],
    ["spd", "SpD"],
    ["spe", "Spe"],
  ];

  const parts = labels
    .filter(([key]) => evs[key] > 0)
    .map(([key, label]) => `${evs[key]} ${label}`);

  return parts.length > 0 ? parts.join(" / ") : "No EVs";
}
