import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  applyStage,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import { normalizeId } from "@/lib/data/normalization";
import type {
  PokemonStatus,
  SpeedAbilityActiveState,
  SpeedNatureBucket,
  StatSpread,
} from "@/lib/types";

type SpeedWeather = "Rain" | "Sun" | "Sand" | "Snow" | undefined;
type SpeedTerrain = "Electric" | "Grassy" | "Psychic" | "Misty" | undefined;
export type MoveOrderRelation = "subject-first" | "tie" | "benchmark-first";

interface SpeedPokemonInput {
  baseStats: {
    spe: number;
  };
}

interface EffectiveSpeedOptions {
  speSp?: number;
  evs?: StatSpread;
  ivs?: StatSpread;
  nature?: string;
  natureBucket?: SpeedNatureBucket;
  level?: number;
  speedStage?: number;
  status?: PokemonStatus;
  hasTailwind?: boolean;
  ability?: string;
  abilityActiveStates?: SpeedAbilityActiveState[];
  item?: string;
  weather?: SpeedWeather;
  terrain?: SpeedTerrain;
}

interface EffectiveSpeedResult {
  rawSpeed: number;
  effectiveSpeed: number;
  multipliers: {
    ability: number;
    item: number;
    tailwind: number;
    paralysis: number;
  };
}

function clampSpeSp(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 32;
  }

  return Math.max(0, Math.min(32, Math.round(value)));
}

function clampStage(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-6, Math.min(6, Math.round(value)));
}

function natureBucketMultiplier(bucket: SpeedNatureBucket | undefined) {
  if (bucket === "plus") return 1.1;
  if (bucket === "minus") return 0.9;
  return 1;
}

function speedNatureBucketFromNature(nature: string | undefined): SpeedNatureBucket {
  const normalized = normalizeId(nature ?? "");

  if (["timid", "hasty", "jolly", "naive"].includes(normalized)) {
    return "plus";
  }

  if (["brave", "relaxed", "quiet", "sassy"].includes(normalized)) {
    return "minus";
  }

  return "neutral";
}

function computeRawSpeed(
  baseSpeed: number,
  options: {
    evs: StatSpread;
    ivs: StatSpread;
    level: number;
    natureBucket?: SpeedNatureBucket;
    nature?: string;
  },
) {
  const ev = options.evs.spe;
  const iv = options.ivs.spe;
  const natureMultiplier =
    options.natureBucket !== undefined
      ? natureBucketMultiplier(options.natureBucket)
      : natureBucketMultiplier(speedNatureBucketFromNature(options.nature));

  return Math.floor(
    (Math.floor(((2 * baseSpeed + iv + Math.floor(ev / 4)) * options.level) / 100) + 5) *
      natureMultiplier,
  );
}

function getSpeedRelevantAbilityMultiplier(
  ability: string | undefined,
  weather: SpeedWeather,
  terrain: SpeedTerrain,
  status: PokemonStatus | undefined,
  abilityActiveStates: SpeedAbilityActiveState[] = [],
) {
  const normalizedAbility = normalizeId(ability ?? "");
  const hasStatus = Boolean(status);

  if (normalizedAbility === "quickfeet" && hasStatus) {
    return 1.5;
  }

  if (normalizedAbility === "unburden") {
    return abilityActiveStates.includes("unburden-active") ? 2 : 1;
  }

  if (normalizedAbility === "swiftswim" && weather === "Rain") {
    return 2;
  }

  if (normalizedAbility === "chlorophyll" && weather === "Sun") {
    return 2;
  }

  if (normalizedAbility === "sandrush" && weather === "Sand") {
    return 2;
  }

  if (normalizedAbility === "slushrush" && weather === "Snow") {
    return 2;
  }

  if (normalizedAbility === "surgesurfer" && terrain === "Electric") {
    return 2;
  }

  return 1;
}

export function getSpeedRelevantItemMultiplier(item: string | undefined) {
  const normalizedItem = normalizeId(item ?? "");

  if (normalizedItem === "choicescarf") {
    return 1.5;
  }

  if (
    new Set([
      "ironball",
      "machobrace",
      "poweranklet",
      "powerband",
      "powerbelt",
      "powerbracer",
      "powerlens",
      "powerweight",
    ]).has(normalizedItem)
  ) {
    return 0.5;
  }

  return 1;
}

export function buildEffectiveSpeed(
  pokemon: SpeedPokemonInput,
  options: EffectiveSpeedOptions,
): EffectiveSpeedResult {
  const evs =
    options.evs ??
    statPointsToCalcEvs({
      ...EMPTY_STAT_SPREAD,
      spe: clampSpeSp(options.speSp),
    });
  const ivs = options.ivs ?? DEFAULT_IV_SPREAD;
  const level = options.level ?? 50;
  const rawSpeed = computeRawSpeed(pokemon.baseStats.spe, {
    evs,
    ivs,
    level,
    nature: options.nature,
    natureBucket: options.natureBucket,
  });
  let effectiveSpeed = applyStage(rawSpeed, clampStage(options.speedStage));
  const quickFeetActive =
    normalizeId(options.ability ?? "") === "quickfeet" && Boolean(options.status);
  const paralysisMultiplier = options.status === "par" && !quickFeetActive ? 0.5 : 1;

  if (paralysisMultiplier !== 1) {
    effectiveSpeed = Math.floor(effectiveSpeed * paralysisMultiplier);
  }

  const abilityMultiplier = getSpeedRelevantAbilityMultiplier(
    options.ability,
    options.weather,
    options.terrain,
    options.status,
    options.abilityActiveStates,
  );
  const itemMultiplier = getSpeedRelevantItemMultiplier(options.item);
  const tailwindMultiplier = options.hasTailwind ? 2 : 1;

  effectiveSpeed = Math.floor(effectiveSpeed * abilityMultiplier);
  effectiveSpeed = Math.floor(effectiveSpeed * itemMultiplier);
  effectiveSpeed = Math.floor(effectiveSpeed * tailwindMultiplier);

  return {
    rawSpeed,
    effectiveSpeed,
    multipliers: {
      ability: abilityMultiplier,
      item: itemMultiplier,
      tailwind: tailwindMultiplier,
      paralysis: paralysisMultiplier,
    },
  };
}

export function compareMoveOrder(
  subjectSpeed: number,
  benchmarkSpeed: number,
  trickRoom = false,
): MoveOrderRelation {
  if (subjectSpeed === benchmarkSpeed) {
    return "tie";
  }

  const subjectFirst = trickRoom
    ? subjectSpeed < benchmarkSpeed
    : subjectSpeed > benchmarkSpeed;

  return subjectFirst ? "subject-first" : "benchmark-first";
}

export function findSpeSpThreshold(
  pokemon: SpeedPokemonInput,
  benchmarkSpeed: number,
  options: Omit<EffectiveSpeedOptions, "speSp"> & { trickRoom?: boolean },
) {
  const matches: number[] = [];
  const ties: number[] = [];

  for (let speSp = 0; speSp <= 32; speSp += 1) {
    const speed = buildEffectiveSpeed(pokemon, {
      ...options,
      speSp,
    }).effectiveSpeed;
    const relation = compareMoveOrder(speed, benchmarkSpeed, options.trickRoom);

    if (relation === "subject-first") {
      matches.push(speSp);
    } else if (relation === "tie") {
      ties.push(speSp);
    }
  }

  return {
    moveFirstSpeSp: options.trickRoom
      ? matches.length
        ? Math.max(...matches)
        : null
      : (matches[0] ?? null),
    tieSpeSp: options.trickRoom
      ? ties.length
        ? Math.max(...ties)
        : null
      : (ties[0] ?? null),
  };
}
