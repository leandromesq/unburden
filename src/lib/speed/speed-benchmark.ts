import { buildEffectiveSpeed, compareMoveOrder, findSpeSpThreshold } from "@/lib/calc/speed-engine";
import { legalPokemonData, pokemonById, resolveMegaEvolution } from "@/lib/data/pokemon";
import { vgcMetaProfiles } from "@/lib/data/vgc-meta";
import type {
  MoveOrderRelation,
} from "@/lib/calc/speed-engine";
import type {
  PokemonEntry,
  SpeedGlobalState,
  SpeedSideState,
  VgcMetaProfile,
} from "@/lib/types";

const legalPokemonIds = new Set(legalPokemonData.map((pokemon) => pokemon.id));

export interface SpeedBenchmarkIdentity {
  profile: VgcMetaProfile;
  pokemon: PokemonEntry;
  resolvedPokemon: PokemonEntry;
  speed: number;
}

export interface SpeedTierGroup {
  speed: number;
  representative: SpeedBenchmarkIdentity;
  members: SpeedBenchmarkIdentity[];
  relation: MoveOrderRelation | "unset";
}

export interface SpeedSideMetrics {
  pokemon: PokemonEntry;
  resolvedPokemon: PokemonEntry;
  rawSpeed: number;
  effectiveSpeed: number;
  item: string | undefined;
}

export interface PinnedSpeedComparator {
  speed: number;
  relation: MoveOrderRelation | "unset";
  metrics: SpeedSideMetrics;
  matchesGeneratedTier: boolean;
}

function speedWeather(globals: SpeedGlobalState) {
  if (globals.rain) return "Rain" as const;
  if (globals.sun) return "Sun" as const;
  if (globals.sand) return "Sand" as const;
  if (globals.snow) return "Snow" as const;
  return undefined;
}

function speedTerrain(globals: SpeedGlobalState) {
  return globals.electricTerrain ? ("Electric" as const) : undefined;
}

export function resolveSpeedSide(side: SpeedSideState, globals: SpeedGlobalState): SpeedSideMetrics | null {
  const pokemon = pokemonById.get(side.speciesId);

  if (!pokemon) return null;

  const resolvedPokemon = resolveMegaEvolution(side.speciesId, side.item) ?? pokemon;
  const result = buildEffectiveSpeed(resolvedPokemon, {
    speSp: side.speSp,
    natureBucket: side.nature,
    speedStage: side.speedStage,
    status: side.paralysis ? "par" : undefined,
    hasTailwind: side.tailwind,
    ability: side.ability,
    abilityActiveStates: side.abilityActiveStates,
    item: side.item,
    weather: speedWeather(globals),
    terrain: speedTerrain(globals),
  });

  return {
    pokemon,
    resolvedPokemon,
    rawSpeed: result.rawSpeed,
    effectiveSpeed: result.effectiveSpeed,
    item: side.item,
  };
}

function buildBenchmarkIdentity(profile: VgcMetaProfile, globals: SpeedGlobalState) {
  if (!legalPokemonIds.has(profile.pokemonId)) {
    return null;
  }

  const pokemon = pokemonById.get(profile.pokemonId);

  if (!pokemon) return null;

  const resolvedPokemon = resolveMegaEvolution(profile.pokemonId, profile.defaultItem) ?? pokemon;
  const speed = buildEffectiveSpeed(resolvedPokemon, {
    speSp: 32,
    natureBucket: "plus",
    ability: profile.defaultAbility,
    item: profile.defaultItem,
    weather: speedWeather(globals),
    terrain: speedTerrain(globals),
  }).effectiveSpeed;

  return {
    profile,
    pokemon,
    resolvedPokemon,
    speed,
  };
}

export function createSpeedSideFromBenchmark(identity: SpeedBenchmarkIdentity): SpeedSideState {
  return {
    source: "species",
    speciesId: identity.profile.pokemonId,
    item: identity.profile.defaultItem,
    ability: identity.profile.defaultAbility,
    abilityActiveStates: [],
    nature: "plus",
    speSp: 32,
    speedStage: 0,
    tailwind: false,
    paralysis: false,
    overrides: [],
  };
}

export function buildSpeedTierGroups(
  globals: SpeedGlobalState,
  subjectSpeed: number | null,
) {
  const identities = vgcMetaProfiles
    .map((profile) => buildBenchmarkIdentity(profile, globals))
    .filter((entry): entry is SpeedBenchmarkIdentity => Boolean(entry));
  const bySpeed = new Map<number, SpeedBenchmarkIdentity[]>();

  for (const identity of identities) {
    const tier = bySpeed.get(identity.speed) ?? [];
    tier.push(identity);
    bySpeed.set(identity.speed, tier);
  }

  return Array.from(bySpeed.entries())
    .sort(([left], [right]) => right - left)
    .map(([speed, members]): SpeedTierGroup => {
      const sortedMembers = [...members].sort(
        (left, right) => left.profile.usageRank - right.profile.usageRank,
      );

      return {
        speed,
        representative: sortedMembers[0],
        members: sortedMembers,
        relation:
          subjectSpeed === null
            ? "unset"
            : compareMoveOrder(subjectSpeed, speed, globals.trickRoom),
      };
    });
}

export function findFocusedTierIndex(groups: SpeedTierGroup[], subjectSpeed: number | null, trickRoom: boolean) {
  if (subjectSpeed === null) return Math.floor(groups.length / 2);

  const matchingIndexes = groups
    .map((group, index) => ({
      index,
      relation: compareMoveOrder(subjectSpeed, group.speed, trickRoom),
    }))
    .filter((entry) => entry.relation === "benchmark-first")
    .map((entry) => entry.index);
  const index = trickRoom
    ? matchingIndexes[0]
    : matchingIndexes[matchingIndexes.length - 1];

  if (index !== undefined) return index;

  return trickRoom ? groups.length - 1 : 0;
}

export function buildPinnedSpeedComparator(
  groups: SpeedTierGroup[],
  comparatorMetrics: SpeedSideMetrics | null,
  subjectSpeed: number | null,
  trickRoom: boolean,
): PinnedSpeedComparator | null {
  if (!comparatorMetrics) return null;

  const relation =
    subjectSpeed === null
      ? "unset"
      : compareMoveOrder(subjectSpeed, comparatorMetrics.effectiveSpeed, trickRoom);

  return {
    speed: comparatorMetrics.effectiveSpeed,
    relation,
    metrics: comparatorMetrics,
    matchesGeneratedTier: groups.some(
      (group) => group.speed === comparatorMetrics.effectiveSpeed,
    ),
  };
}

export function describeSubjectThreshold(
  side: SpeedSideState,
  benchmarkSpeed: number,
  globals: SpeedGlobalState,
) {
  const pokemon = pokemonById.get(side.speciesId);

  if (!pokemon) return null;

  const resolvedPokemon = resolveMegaEvolution(side.speciesId, side.item) ?? pokemon;
  const threshold = findSpeSpThreshold(resolvedPokemon, benchmarkSpeed, {
    natureBucket: side.nature,
    speedStage: side.speedStage,
    status: side.paralysis ? "par" : undefined,
    hasTailwind: side.tailwind,
    ability: side.ability,
    abilityActiveStates: side.abilityActiveStates,
    item: side.item,
    weather: speedWeather(globals),
    terrain: speedTerrain(globals),
    trickRoom: globals.trickRoom,
  });

  if (threshold.moveFirstSpeSp !== null) {
    return globals.trickRoom
      ? `Can run up to ${threshold.moveFirstSpeSp} Spe SP and still move first under Trick Room.`
      : `Needs ${threshold.moveFirstSpeSp} Spe SP to move first.`;
  }

  if (threshold.tieSpeSp !== null) {
    return globals.trickRoom
      ? `Can run up to ${threshold.tieSpeSp} Spe SP to speed tie under Trick Room.`
      : `Needs ${threshold.tieSpeSp} Spe SP to speed tie.`;
  }

  const canUseChoiceScarf =
    !globals.trickRoom &&
    side.item !== "Choice Scarf" &&
    !resolvedPokemon.isMega &&
    !resolvedPokemon.requiredItem;

  if (canUseChoiceScarf) {
    const scarfThreshold = findSpeSpThreshold(resolvedPokemon, benchmarkSpeed, {
      natureBucket: side.nature,
      speedStage: side.speedStage,
      status: side.paralysis ? "par" : undefined,
      hasTailwind: side.tailwind,
      ability: side.ability,
      abilityActiveStates: side.abilityActiveStates,
      item: "Choice Scarf",
      weather: speedWeather(globals),
      terrain: speedTerrain(globals),
      trickRoom: globals.trickRoom,
    });

    if (scarfThreshold.moveFirstSpeSp !== null) {
      return scarfThreshold.moveFirstSpeSp === 0
        ? "Choice Scarf lets this Pokemon move first with 0 Spe SP."
        : `Needs Choice Scarf and ${scarfThreshold.moveFirstSpeSp} Spe SP to move first.`;
    }

    if (scarfThreshold.tieSpeSp !== null) {
      return scarfThreshold.tieSpeSp === 0
        ? "Choice Scarf lets this Pokemon speed tie with 0 Spe SP."
        : `Needs Choice Scarf and ${scarfThreshold.tieSpeSp} Spe SP to speed tie.`;
    }
  }

  return null;
}
