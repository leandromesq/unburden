import type {
  PikalyticsIndexEntry,
  UsageEntry,
} from "../fetch/fetch-pikalytics";

export type PokemonEntry = {
  id: string;
  name: string;
  aliases: string[];
  types: string[];
  abilities: string[];
  isMega?: boolean;
  requiredItem?: string;
  baseSpeciesId?: string;
  defaultFormOf?: string;
};

export type MoveEntry = {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  category: string;
  basePower: number;
};

export type FormAliasEntry = {
  alias: string;
  pokemonId: string;
};

export type ItemEntry = {
  id: string;
  name: string;
};

export type VgcMetaProfile = {
  pokemonId: string;
  defaultItem: string;
  defaultAbility: string;
  defaultMove: string;
  commonMoves?: string[];
  commonAbilities?: string[];
  commonItems?: string[];
};

export type VgcMetaOverrides = {
  format?: string;
  minWeightedUsage?: number;
  commonMoveLimit?: number;
  commonAbilityLimit?: number;
  commonItemLimit?: number;
  speciesIdOverrides?: Record<string, string>;
  profileOverrides?: Record<string, Partial<VgcMetaProfile>>;
};

export type RegulationEntry = {
  id: string;
  allowedPokemonIds: string[];
};

export const DEFAULT_COMMON_MOVE_LIMIT = 8;
export const DEFAULT_COMMON_ABILITY_LIMIT = 6;
export const DEFAULT_COMMON_ITEM_LIMIT = 6;
const DOMINANT_UNMATCHED_ABILITY_USAGE_PERCENT = 60;
const HIGH_DAMAGE_THRESHOLD = 90;
const MEDIUM_DAMAGE_THRESHOLD = 70;
const MIN_META_PROFILE_COUNT = 50;
const MAX_META_PROFILE_COUNT_DELTA = 40;

const EFFECTIVE_POWER_OVERRIDES = new Map<string, number>([
  ["surgingstrikes", 75],
  ["wickedblow", 75],
  ["populationbomb", 100],
  ["tripleaxel", 120],
  ["rockblast", 75],
  ["bulletseed", 75],
  ["scaleshot", 100],
]);

export function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactAlias(value: string) {
  return normalizeAlias(value).replace(/\s+/g, "");
}

export function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function canonicalizeLegalItemName(
  itemName: string | null | undefined,
  legalItemById: Map<string, string>,
) {
  if (!itemName) {
    return null;
  }

  return legalItemById.get(normalizeId(itemName)) ?? null;
}

function getEffectiveDamagePower(move: MoveEntry) {
  return (
    EFFECTIVE_POWER_OVERRIDES.get(normalizeId(move.name)) ?? move.basePower
  );
}

function assertUniquePokemonIds(entries: VgcMetaProfile[]) {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.pokemonId)) {
      throw new Error(
        `Duplicate meta profile detected for pokemon id: ${entry.pokemonId}`,
      );
    }

    seen.add(entry.pokemonId);
  }
}

export function validateMetaProfiles(
  entries: VgcMetaProfile[],
  pokemonById: Map<string, PokemonEntry>,
  legalItemById: Map<string, string>,
  moveIndex: Map<string, MoveEntry>,
) {
  if (entries.length < MIN_META_PROFILE_COUNT) {
    throw new Error(
      `Generated only ${entries.length} meta profiles; expected at least ${MIN_META_PROFILE_COUNT}.`,
    );
  }

  assertUniquePokemonIds(entries);

  for (const entry of entries) {
    if (!pokemonById.has(entry.pokemonId)) {
      throw new Error(
        `Meta profile references unknown pokemon id: ${entry.pokemonId}`,
      );
    }

    if (!entry.defaultAbility.trim()) {
      throw new Error(
        `Meta profile ${entry.pokemonId} is missing a default ability.`,
      );
    }

    if (!entry.defaultItem.trim()) {
      throw new Error(
        `Meta profile ${entry.pokemonId} is missing a default item.`,
      );
    }

    if (!entry.defaultMove.trim()) {
      throw new Error(
        `Meta profile ${entry.pokemonId} is missing a default move.`,
      );
    }

    if (!legalItemById.has(normalizeId(entry.defaultItem))) {
      throw new Error(
        `Meta profile ${entry.pokemonId} references illegal default item: ${entry.defaultItem}`,
      );
    }

    if (!moveIndex.has(compactAlias(entry.defaultMove))) {
      throw new Error(
        `Meta profile ${entry.pokemonId} references unknown default move: ${entry.defaultMove}`,
      );
    }

    for (const itemName of entry.commonItems ?? []) {
      if (!legalItemById.has(normalizeId(itemName))) {
        throw new Error(
          `Meta profile ${entry.pokemonId} references illegal common item: ${itemName}`,
        );
      }
    }

    for (const moveName of entry.commonMoves ?? []) {
      if (!moveIndex.has(compactAlias(moveName))) {
        throw new Error(
          `Meta profile ${entry.pokemonId} references unknown common move: ${moveName}`,
        );
      }
    }
  }
}

export function warnOnLargeProfileDelta(
  previousCount: number | null,
  nextCount: number,
) {
  if (previousCount === null) {
    return;
  }

  const delta = Math.abs(previousCount - nextCount);

  if (delta > MAX_META_PROFILE_COUNT_DELTA) {
    console.warn(
      `[warn] vgc-meta profile count changed by ${delta} entries (${previousCount} -> ${nextCount}).`,
    );
  }
}

export function buildPokemonIdIndex(
  pokemonData: PokemonEntry[],
  formAliases: FormAliasEntry[],
  explicitOverrides: Record<string, string>,
) {
  const index = new Map<string, string>();

  for (const entry of pokemonData) {
    const keys = [entry.id, entry.name, ...entry.aliases];

    for (const key of keys) {
      const normalized = compactAlias(key);

      if (!normalized || index.has(normalized)) {
        continue;
      }

      index.set(normalized, entry.id);
    }
  }

  for (const entry of formAliases) {
    index.set(compactAlias(entry.alias), entry.pokemonId);
  }

  for (const [alias, pokemonId] of Object.entries(explicitOverrides)) {
    index.set(compactAlias(alias), pokemonId);
  }

  return index;
}

export function buildMoveIndex(moveData: MoveEntry[]) {
  const index = new Map<string, MoveEntry>();

  for (const move of moveData) {
    const keys = [move.id, move.name, ...move.aliases];

    for (const key of keys) {
      const normalized = compactAlias(key);

      if (!normalized || index.has(normalized)) {
        continue;
      }

      index.set(normalized, move);
    }
  }

  return index;
}

export function buildSpeciesNameByPokemonId(
  indexEntries: PikalyticsIndexEntry[],
  pokemonIdIndex: Map<string, string>,
) {
  const speciesNameByPokemonId = new Map<string, string>();

  for (const entry of indexEntries) {
    const pokemonId = pokemonIdIndex.get(compactAlias(entry.speciesName));

    if (!pokemonId || speciesNameByPokemonId.has(pokemonId)) {
      continue;
    }

    speciesNameByPokemonId.set(pokemonId, entry.speciesName);
  }

  return speciesNameByPokemonId;
}

export function buildPikalyticsSpeciesNameCandidates(
  pokemon: PokemonEntry,
  pokemonById: Map<string, PokemonEntry>,
) {
  const candidates = new Set<string>([pokemon.name]);
  const basePokemon =
    pokemonById.get(pokemon.defaultFormOf ?? "") ??
    pokemonById.get(pokemon.baseSpeciesId ?? "");

  if (basePokemon) {
    candidates.add(basePokemon.name);
  }

  if (pokemon.name.includes("-Mega")) {
    const compactMega = pokemon.name.replace(/-Mega-/g, "-Mega ");
    const spacedMega = compactMega.replace(/-/g, " ");
    candidates.add(compactMega);
    candidates.add(spacedMega);

    if (basePokemon) {
      const megaSuffix = spacedMega.replace(
        new RegExp(`^${basePokemon.name}\\s*`, "i"),
        "",
      );

      if (megaSuffix) {
        candidates.add(`Mega ${basePokemon.name} ${megaSuffix}`.trim());
      }
    }
  }

  if (pokemon.name.endsWith("-F")) {
    candidates.add(pokemon.name.replace(/-F$/, ""));
  }

  return Array.from(candidates);
}

export function resolveDefaultItem(
  itemUsage: UsageEntry[],
  previousProfile: VgcMetaProfile | undefined,
  commonItemLimit: number,
  legalItemById: Map<string, string>,
) {
  const items = dedupeStrings(
    itemUsage
      .map((entry) => canonicalizeLegalItemName(entry.name, legalItemById))
      .filter(Boolean),
  );
  const fallbackDefault =
    canonicalizeLegalItemName(previousProfile?.defaultItem, legalItemById) ??
    null;

  return {
    defaultItem: items[0] ?? fallbackDefault,
    commonItems: items.slice(0, commonItemLimit),
  };
}

export function resolveDefaultAbility(
  abilityUsage: UsageEntry[],
  pokemon: PokemonEntry,
  previousProfile: VgcMetaProfile | undefined,
  commonAbilityLimit: number,
) {
  const legalAbilities = new Set(pokemon.abilities.map((ability) => ability));
  const commonAbilities = dedupeStrings(
    abilityUsage
      .filter((entry) => legalAbilities.has(entry.name))
      .map((entry) => entry.name),
  ).slice(0, commonAbilityLimit);
  const matchedDominantAbility =
    abilityUsage.find((entry) => legalAbilities.has(entry.name))?.name ?? null;
  const dominantUnmatchedAbility = abilityUsage.find(
    (entry) =>
      !legalAbilities.has(entry.name) &&
      entry.usage >= DOMINANT_UNMATCHED_ABILITY_USAGE_PERCENT,
  );
  const defaultAbility =
    matchedDominantAbility ??
    (dominantUnmatchedAbility
      ? pokemon.abilities[0]
      : commonAbilities[0] ?? previousProfile?.defaultAbility ?? null);

  return {
    defaultAbility,
    commonAbilities,
  };
}

export function resolveMoveProfile(
  moveUsage: UsageEntry[],
  pokemon: PokemonEntry,
  moveIndex: Map<string, MoveEntry>,
  previousProfile: VgcMetaProfile | undefined,
  commonMoveLimit: number,
) {
  const candidateMoves = moveUsage
    .map((entry) => ({
      usage: entry.usage,
      move: moveIndex.get(compactAlias(entry.name)) ?? null,
    }))
    .filter(
      (entry): entry is { usage: number; move: MoveEntry } => Boolean(entry.move),
    );

  const commonMoves = dedupeStrings(
    candidateMoves.map((entry) => entry.move.name),
  ).slice(0, commonMoveLimit);
  const highestPowerMove = [...candidateMoves]
    .sort((left, right) => {
      const powerDelta =
        getEffectiveDamagePower(right.move) - getEffectiveDamagePower(left.move);

      if (powerDelta !== 0) {
        return powerDelta;
      }

      return right.usage - left.usage;
    })[0]?.move;
  const highestUsageMove = candidateMoves[0]?.move ?? null;
  const physicalMoves = candidateMoves.filter(
    (entry) => entry.move.category === "Physical",
  );
  const specialMoves = candidateMoves.filter(
    (entry) => entry.move.category === "Special",
  );
  const defaultMove =
    (pokemon.types.includes("Fire") &&
    specialMoves.find((entry) => entry.move.type === "Fire")?.usage &&
    specialMoves[0]?.usage
      ? specialMoves.find((entry) => entry.move.type === "Fire")?.move
      : null) ??
    (highestPowerMove &&
    getEffectiveDamagePower(highestPowerMove) >= HIGH_DAMAGE_THRESHOLD
      ? highestPowerMove
      : null) ??
    (physicalMoves[0]?.usage &&
    specialMoves[0]?.usage &&
    Math.abs(physicalMoves[0].usage - specialMoves[0].usage) <=
      MEDIUM_DAMAGE_THRESHOLD
      ? [physicalMoves[0], specialMoves[0]]
          .sort(
            (left, right) =>
              getEffectiveDamagePower(right.move) -
                getEffectiveDamagePower(left.move) || right.usage - left.usage,
          )[0]?.move
      : null) ??
    highestUsageMove ??
    moveIndex.get(compactAlias(previousProfile?.defaultMove ?? "")) ??
    null;

  return {
    defaultMove: defaultMove?.name ?? null,
    commonMoves,
  };
}

export function mergeProfile(
  baseProfile: VgcMetaProfile,
  override: Partial<VgcMetaProfile> | undefined,
) {
  if (!override) {
    return baseProfile;
  }

  return {
    ...baseProfile,
    ...override,
    commonMoves: dedupeStrings([
      ...(override.commonMoves ?? baseProfile.commonMoves ?? []),
    ]),
    commonAbilities: dedupeStrings([
      ...(override.commonAbilities ?? baseProfile.commonAbilities ?? []),
    ]),
    commonItems: dedupeStrings([
      ...(override.commonItems ?? baseProfile.commonItems ?? []),
    ]),
  };
}

export function finalizeMetaProfiles(
  baseProfiles: Array<{ usagePercent: number; profile: VgcMetaProfile }>,
) {
  return dedupeStrings(baseProfiles.map(({ profile }) => JSON.stringify(profile)))
    .map((profileText) => JSON.parse(profileText) as VgcMetaProfile)
    .sort((left, right) => left.pokemonId.localeCompare(right.pokemonId));
}
