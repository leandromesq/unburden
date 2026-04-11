import type { StatSpread } from "@/lib/types";

export const EMPTY_STAT_SPREAD: StatSpread = {
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

export const DEFAULT_IV_SPREAD: StatSpread = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

export const MAX_STAT_POINTS = 66;
const MAX_STAT_POINTS_PER_STAT = 32;

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

interface ComputedStats {
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
function stageMultiplier(stage: number): number {
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

function spreadKeys(): Array<keyof StatSpread> {
  return ["hp", "atk", "def", "spa", "spd", "spe"];
}

export function cloneStatSpread(
  spread: Partial<StatSpread> | undefined,
  fallback: StatSpread = EMPTY_STAT_SPREAD,
): StatSpread {
  return {
    hp: spread?.hp ?? fallback.hp,
    atk: spread?.atk ?? fallback.atk,
    def: spread?.def ?? fallback.def,
    spa: spread?.spa ?? fallback.spa,
    spd: spread?.spd ?? fallback.spd,
    spe: spread?.spe ?? fallback.spe,
  };
}

export function sumStatPoints(statPoints: StatSpread): number {
  return spreadKeys().reduce((total, key) => total + statPoints[key], 0);
}

export function evsToStatPoints(evs: StatSpread): StatSpread {
  return {
    hp: Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(evs.hp / 8)),
    atk: Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(evs.atk / 8)),
    def: Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(evs.def / 8)),
    spa: Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(evs.spa / 8)),
    spd: Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(evs.spd / 8)),
    spe: Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(evs.spe / 8)),
  };
}

export function statPointsToCalcEvs(statPoints: StatSpread): StatSpread {
  return {
    hp: Math.min(252, statPoints.hp * 8),
    atk: Math.min(252, statPoints.atk * 8),
    def: Math.min(252, statPoints.def * 8),
    spa: Math.min(252, statPoints.spa * 8),
    spd: Math.min(252, statPoints.spd * 8),
    spe: Math.min(252, statPoints.spe * 8),
  };
}

export function clampStatPoints(statPoints: StatSpread): StatSpread {
  const next = cloneStatSpread(statPoints);

  for (const key of spreadKeys()) {
    next[key] = Math.max(
      0,
      Math.min(MAX_STAT_POINTS_PER_STAT, Math.round(next[key])),
    );
  }

  let overflow = sumStatPoints(next) - MAX_STAT_POINTS;

  if (overflow <= 0) {
    return next;
  }

  const removalOrder: Array<keyof StatSpread> = [
    "spe",
    "spd",
    "spa",
    "def",
    "atk",
    "hp",
  ];

  while (overflow > 0) {
    let changed = false;

    for (const key of removalOrder) {
      if (next[key] > 0 && overflow > 0) {
        next[key] -= 1;
        overflow -= 1;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return next;
}

export function formatStatPointSpread(statPoints: StatSpread): string {
  const labels: Array<[keyof StatSpread, string]> = [
    ["hp", "HP"],
    ["atk", "Atk"],
    ["def", "Def"],
    ["spa", "SpA"],
    ["spd", "SpD"],
    ["spe", "Spe"],
  ];

  const parts = labels
    .filter(([key]) => statPoints[key] > 0)
    .map(([key, label]) => `${statPoints[key]} ${label}`);

  return parts.length > 0 ? parts.join(" / ") : "0 SPs";
}
