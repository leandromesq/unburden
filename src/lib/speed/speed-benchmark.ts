import {
  buildEffectiveSpeed,
  compareMoveOrder,
  findSpeSpThreshold,
  getSpeedRelevantItemMultiplier,
} from "@/lib/calc/speed-engine";
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
const MIN_SPEED_ITEM_USAGE_PERCENT = 10;
const MIN_SPEED_ITEM_WEIGHTED_USAGE_PERCENT = 0.5;

type SpeedItemUsage = { item: string; usagePercent?: number };

export interface SpeedBenchmarkIdentity {
  profile: VgcMetaProfile;
  pokemon: PokemonEntry;
  resolvedPokemon: PokemonEntry;
  speed: number;
  item?: string;
  itemUsagePercent?: number;
  weightedUsagePercent?: number;
}

export interface SpeedUsageBenchmarkIdentity extends SpeedBenchmarkIdentity {
  nature: string;
  speSp: number;
  usagePercent: number;
}

export interface SpeedTierGroup {
  speed: number;
  representative: SpeedBenchmarkIdentity;
  members: SpeedBenchmarkIdentity[];
  relation: MoveOrderRelation | "unset";
}

export interface SpeedUsageTierGroup {
  speed: number;
  representative: SpeedUsageBenchmarkIdentity;
  members: SpeedUsageBenchmarkIdentity[];
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

function isSpeedRelevantItem(item: string | undefined) {
  return getSpeedRelevantItemMultiplier(item) !== 1;
}

function normalizeItemUsagePercentages(itemUsages: SpeedItemUsage[]) {
  if (!itemUsages.length) return itemUsages;

  const firstUsage = itemUsages[0].usagePercent;

  if (firstUsage === undefined || firstUsage <= 100) {
    return itemUsages;
  }

  const divisor = firstUsage / 100;

  return itemUsages.map((entry) => ({
    ...entry,
    usagePercent:
      entry.usagePercent === undefined ? undefined : entry.usagePercent / divisor,
  }));
}

function normalizeSpeedUsagePercentages<T extends { usagePercent: number }>(
  usages: T[],
) {
  if (!usages.length) return usages;

  const firstUsage = usages[0].usagePercent;

  if (firstUsage <= 100) return usages;

  const divisor = firstUsage / 100;

  return usages.map((entry) => ({
    ...entry,
    usagePercent: entry.usagePercent / divisor,
  }));
}

function isExpressiveSpeedItem(
  profile: VgcMetaProfile,
  itemUsage: SpeedItemUsage,
) {
  if (!isSpeedRelevantItem(itemUsage.item)) {
    return false;
  }

  if (itemUsage.usagePercent === undefined) {
    return (profile.usagePercent ?? 0) >= MIN_SPEED_ITEM_WEIGHTED_USAGE_PERCENT;
  }

  const weightedUsage = ((profile.usagePercent ?? 0) * itemUsage.usagePercent) / 100;

  return (
    itemUsage.usagePercent >= MIN_SPEED_ITEM_USAGE_PERCENT &&
    weightedUsage >= MIN_SPEED_ITEM_WEIGHTED_USAGE_PERCENT
  );
}

function speedNatureBucketFromNatureName(nature: string | undefined) {
  const normalized = nature?.toLowerCase() ?? "";

  if (["timid", "hasty", "jolly", "naive"].includes(normalized)) {
    return "plus" as const;
  }

  if (["brave", "relaxed", "quiet", "sassy"].includes(normalized)) {
    return "minus" as const;
  }

  return "neutral" as const;
}

function isSpeedUsageBenchmarkIdentity(
  identity: SpeedBenchmarkIdentity,
): identity is SpeedUsageBenchmarkIdentity {
  return "speSp" in identity && "nature" in identity;
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

function getBenchmarkBaselineItem(profile: VgcMetaProfile, pokemon: PokemonEntry) {
  if (pokemon.isMega || pokemon.requiredItem) {
    return pokemon.requiredItem ?? profile.defaultItem;
  }

  return undefined;
}

function resolveBenchmarkPokemon(profile: VgcMetaProfile, item?: string) {
  if (!legalPokemonIds.has(profile.pokemonId)) {
    return null;
  }

  const pokemon = pokemonById.get(profile.pokemonId);

  if (!pokemon) return null;

  return {
    pokemon,
    resolvedPokemon: resolveMegaEvolution(profile.pokemonId, item) ?? pokemon,
  };
}

function buildBenchmarkIdentity(profile: VgcMetaProfile, globals: SpeedGlobalState) {
  const baseResolved = resolveBenchmarkPokemon(profile);

  if (!baseResolved) return null;

  const item = getBenchmarkBaselineItem(profile, baseResolved.pokemon);
  const resolved = resolveBenchmarkPokemon(profile, item) ?? baseResolved;
  const speed = buildEffectiveSpeed(resolved.resolvedPokemon, {
    speSp: 32,
    natureBucket: "plus",
    ability: profile.defaultAbility,
    item,
    weather: speedWeather(globals),
    terrain: speedTerrain(globals),
  }).effectiveSpeed;

  return {
    profile,
    pokemon: resolved.pokemon,
    resolvedPokemon: resolved.resolvedPokemon,
    speed,
    item,
  };
}

function buildSpeedItemBenchmarkIdentities(
  profile: VgcMetaProfile,
  globals: SpeedGlobalState,
) {
  const itemUsages: SpeedItemUsage[] = normalizeItemUsagePercentages(
    profile.itemUsages ??
    [{ item: profile.defaultItem }],
  );

  return itemUsages
    .filter((itemUsage) => isExpressiveSpeedItem(profile, itemUsage))
    .flatMap((itemUsage): SpeedBenchmarkIdentity[] => {
      const resolved = resolveBenchmarkPokemon(profile, itemUsage.item);

      if (!resolved) return [];

      return [{
        profile,
        pokemon: resolved.pokemon,
        resolvedPokemon: resolved.resolvedPokemon,
        speed: buildEffectiveSpeed(resolved.resolvedPokemon, {
          speSp: 32,
          natureBucket: "plus",
          ability: profile.defaultAbility,
          item: itemUsage.item,
          weather: speedWeather(globals),
          terrain: speedTerrain(globals),
        }).effectiveSpeed,
        item: itemUsage.item,
        itemUsagePercent: itemUsage.usagePercent,
        weightedUsagePercent:
          itemUsage.usagePercent === undefined
            ? undefined
            : ((profile.usagePercent ?? 0) * itemUsage.usagePercent) / 100,
      } satisfies SpeedBenchmarkIdentity];
    });
}

function buildSpeedUsageIdentities(
  profile: VgcMetaProfile,
  globals: SpeedGlobalState,
) {
  const baseResolved = resolveBenchmarkPokemon(profile);

  if (!baseResolved) return [];

  const item = getBenchmarkBaselineItem(profile, baseResolved.pokemon);
  const resolved = resolveBenchmarkPokemon(profile, item) ?? baseResolved;
  const rawUsages = profile.speedUsages ?? [];
  const normalizedUsages = normalizeSpeedUsagePercentages(rawUsages);

  return normalizedUsages.map((speedUsage) => ({
    profile,
    pokemon: resolved.pokemon,
    resolvedPokemon: resolved.resolvedPokemon,
    nature: speedUsage.nature,
    speSp: speedUsage.speSp,
    usagePercent: speedUsage.usagePercent,
    speed: buildEffectiveSpeed(resolved.resolvedPokemon, {
      speSp: speedUsage.speSp,
      nature: speedUsage.nature,
      ability: profile.defaultAbility,
      item,
      weather: speedWeather(globals),
      terrain: speedTerrain(globals),
    }).effectiveSpeed,
    item,
  }));
}

export function createSpeedSideFromBenchmark(identity: SpeedBenchmarkIdentity): SpeedSideState {
  return {
    source: "species",
    speciesId: identity.profile.pokemonId,
    item: identity.item,
    ability: identity.profile.defaultAbility,
    abilityActiveStates: [],
    nature: isSpeedUsageBenchmarkIdentity(identity)
      ? speedNatureBucketFromNatureName(identity.nature)
      : "plus",
    speSp: isSpeedUsageBenchmarkIdentity(identity) ? identity.speSp : 32,
    speedStage: 0,
    tailwind: false,
    paralysis: false,
    overrides: [],
  };
}

export function buildSpeedTierGroups(
  globals: SpeedGlobalState,
  subjectSpeed: number | null,
  profiles: VgcMetaProfile[] = vgcMetaProfiles,
) {
  const identities = profiles.flatMap((profile) => {
    const baseline = buildBenchmarkIdentity(profile, globals);

    return [
      ...(baseline ? [baseline] : []),
      ...buildSpeedItemBenchmarkIdentities(profile, globals),
    ];
  });
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

export function buildSpeedUsageTierGroups(
  globals: SpeedGlobalState,
  subjectSpeed: number | null,
  profiles: VgcMetaProfile[] = vgcMetaProfiles,
) {
  const identities = profiles.flatMap((profile) =>
    buildSpeedUsageIdentities(profile, globals),
  );
  const bySpeed = new Map<number, SpeedUsageBenchmarkIdentity[]>();

  for (const identity of identities) {
    const tier = bySpeed.get(identity.speed) ?? [];
    tier.push(identity);
    bySpeed.set(identity.speed, tier);
  }

  return Array.from(bySpeed.entries())
    .sort(([left], [right]) => right - left)
    .map(([speed, members]): SpeedUsageTierGroup => {
      const sortedMembers = [...members].sort((left, right) => {
        if (right.usagePercent !== left.usagePercent) {
          return right.usagePercent - left.usagePercent;
        }

        return left.profile.usageRank - right.profile.usageRank;
      });

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
