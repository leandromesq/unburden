export type UsageEntry = {
  name: string;
  usage: number;
};

export type MetaIndexEntry = {
  speciesName: string;
};

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

export type VgcMetaSpeedUsage = {
  nature: string;
  speSp: number;
  usagePercent: number;
};

export type VgcMetaItemUsage = {
  item: string;
  usagePercent: number;
};

export type VgcMetaProfile = {
  pokemonId: string;
  usageRank: number;
  usagePercent?: number;
  defaultItem: string;
  defaultAbility: string;
  defaultMove: string;
  commonMoves?: string[];
  commonAbilities?: string[];
  commonItems?: string[];
  itemUsages?: VgcMetaItemUsage[];
  speedUsages?: VgcMetaSpeedUsage[];
};

export type VgcMetaOverrides = {
  source?: "smogon";
  format?: string;
  month?: string;
  cutoff?: number;
  minWeightedUsage?: number;
  commonMoveLimit?: number;
  commonAbilityLimit?: number;
  commonItemLimit?: number;
  commonSpeedUsageLimit?: number;
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
export const DEFAULT_COMMON_SPEED_USAGE_LIMIT = 6;
const DOMINANT_UNMATCHED_ABILITY_USAGE_PERCENT = 60;
const MIN_META_PROFILE_COUNT = 50;
const MAX_META_PROFILE_COUNT_DELTA = 40;

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactAlias(value: string) {
  return normalizeAlias(value).replace(/\s+/g, "");
}

function evToStatPointsValue(ev: number) {
  return Math.min(32, Math.round(ev / 8));
}

function spreadValueToSpeSp(value: number) {
  return Math.max(0, Math.min(32, value <= 32 ? Math.round(value) : evToStatPointsValue(value)));
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

    for (const itemUsage of entry.itemUsages ?? []) {
      if (!legalItemById.has(normalizeId(itemUsage.item))) {
        throw new Error(
          `Meta profile ${entry.pokemonId} references illegal item usage: ${itemUsage.item}`,
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
  indexEntries: MetaIndexEntry[],
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

export function buildMetaSpeciesNameCandidates(
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
  const canonicalizedItemUsage = itemUsage
    .map((entry) => ({
      ...entry,
      item: canonicalizeLegalItemName(entry.name, legalItemById),
    }))
    .filter((entry): entry is UsageEntry & { item: string } =>
      Boolean(entry.item),
    );
  const items = dedupeStrings(
    canonicalizedItemUsage.map((entry) => entry.item),
  );
  const fallbackDefault =
    canonicalizeLegalItemName(previousProfile?.defaultItem, legalItemById) ??
    null;

  return {
    defaultItem: items[0] ?? fallbackDefault,
    commonItems: items.slice(0, commonItemLimit),
    itemUsages: canonicalizedItemUsage
      .map((entry) => ({ item: entry.item, usagePercent: entry.usage }))
      .slice(0, commonItemLimit),
  };
}

export function resolveDefaultAbility(
  abilityUsage: UsageEntry[],
  pokemon: PokemonEntry,
  previousProfile: VgcMetaProfile | undefined,
  commonAbilityLimit: number,
) {
  const legalAbilityByAlias = new Map(
    pokemon.abilities.map((ability) => [compactAlias(ability), ability]),
  );
  const canonicalizedAbilityUsage = abilityUsage.map((entry) => ({
    ...entry,
    ability: legalAbilityByAlias.get(compactAlias(entry.name)) ?? null,
  }));
  const commonAbilities = dedupeStrings(
    canonicalizedAbilityUsage.map((entry) => entry.ability),
  ).slice(0, commonAbilityLimit);
  const matchedDominantAbility =
    canonicalizedAbilityUsage.find((entry) => entry.ability)?.ability ?? null;
  const dominantUnmatchedAbility = canonicalizedAbilityUsage.find(
    (entry) =>
      !entry.ability && entry.usage >= DOMINANT_UNMATCHED_ABILITY_USAGE_PERCENT,
  );
  const defaultAbility =
    matchedDominantAbility ??
    (dominantUnmatchedAbility
      ? pokemon.abilities[0]
      : (commonAbilities[0] ?? previousProfile?.defaultAbility ?? null));

  return {
    defaultAbility,
    commonAbilities,
  };
}

export function resolveSpeedUsages(
  spreadUsage: UsageEntry[],
  previousProfile: VgcMetaProfile | undefined,
  commonSpeedUsageLimit = DEFAULT_COMMON_SPEED_USAGE_LIMIT,
) {
  const seen = new Set<string>();
  const speedUsages = spreadUsage
    .map((entry) => {
      const [nature, spread] = entry.name.split(":");
      const spreadValues = (spread ?? "")
        .split("/")
        .map((value) => Number(value.trim()));
      const speedValue = spreadValues[5];

      if (!nature?.trim() || !Number.isFinite(speedValue)) {
        return null;
      }

      return {
        nature: nature.trim(),
        speSp: spreadValueToSpeSp(speedValue),
        usagePercent: entry.usage,
      } satisfies VgcMetaSpeedUsage;
    })
    .filter((entry): entry is VgcMetaSpeedUsage => Boolean(entry))
    .filter((entry) => {
      const key = `${entry.nature}:${entry.speSp}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, commonSpeedUsageLimit);

  return speedUsages.length ? speedUsages : previousProfile?.speedUsages;
}

export function resolveMoveProfile(
  moveUsage: UsageEntry[],
  moveIndex: Map<string, MoveEntry>,
  previousProfile: VgcMetaProfile | undefined,
  commonMoveLimit: number,
) {
  const candidateMoves = moveUsage
    .map((entry) => ({
      usage: entry.usage,
      move: moveIndex.get(compactAlias(entry.name)) ?? null,
    }))
    .filter((entry): entry is { usage: number; move: MoveEntry } =>
      Boolean(entry.move),
    );

  const commonMoves = dedupeStrings(
    candidateMoves.map((entry) => entry.move.name),
  ).slice(0, commonMoveLimit);
  const highestUsageMove = candidateMoves[0]?.move ?? null;
  const defaultMove =
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
    itemUsages: override.itemUsages ?? baseProfile.itemUsages,
    speedUsages: override.speedUsages ?? baseProfile.speedUsages,
  };
}

export function finalizeMetaProfiles(
  baseProfiles: Array<{ usagePercent: number; profile: VgcMetaProfile }>,
) {
  return dedupeStrings(
    baseProfiles.map(({ usagePercent, profile }, index) =>
      JSON.stringify({
        ...profile,
        usageRank:
          Number.isFinite(profile.usageRank) &&
          profile.usageRank !== Number.MAX_SAFE_INTEGER
            ? profile.usageRank
            : index + 1,
        usagePercent,
      }),
    ),
  )
    .map((profileText) => JSON.parse(profileText) as VgcMetaProfile)
    .sort((left, right) => left.pokemonId.localeCompare(right.pokemonId));
}
