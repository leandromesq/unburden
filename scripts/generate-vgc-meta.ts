import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type PokemonEntry = {
  id: string;
  name: string;
  aliases: string[];
  types: string[];
  abilities: string[];
};

type MoveEntry = {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  category: string;
  basePower: number;
};

type FormAliasEntry = {
  alias: string;
  pokemonId: string;
};

type VgcMetaProfile = {
  pokemonId: string;
  defaultItem: string;
  defaultAbility: string;
  defaultMove: string;
  commonMoves?: string[];
  commonAbilities?: string[];
};

type VgcMetaOverrides = {
  format?: string;
  minWeightedUsage?: number;
  commonMoveLimit?: number;
  commonAbilityLimit?: number;
  speciesIdOverrides?: Record<string, string>;
  profileOverrides?: Record<string, Partial<VgcMetaProfile>>;
};

type RankedUsageMap = Record<string, number>;

type SmogonUsage = {
  raw?: number;
  real?: number;
  weighted?: number;
};

type SmogonPokemonStats = {
  usage?: SmogonUsage;
  abilities?: RankedUsageMap;
  items?: RankedUsageMap;
  moves?: RankedUsageMap;
};

type SmogonStatsResponse = {
  pokemon: Record<string, SmogonPokemonStats>;
};

type StatsIndexResponse = Record<string, [number, number]>;

const SMOGON_STATS_BASE_URL = "https://pkmn.github.io/smogon/data/stats";
const DEFAULT_MIN_WEIGHTED_USAGE = 0.001;
const DEFAULT_COMMON_MOVE_LIMIT = 8;
const DEFAULT_COMMON_ABILITY_LIMIT = 3;
const HIGH_DAMAGE_THRESHOLD = 90;
const MEDIUM_DAMAGE_THRESHOLD = 70;

const EFFECTIVE_POWER_OVERRIDES = new Map<string, number>([
  ["surgingstrikes", 75],
  ["wickedblow", 75],
  ["populationbomb", 100],
  ["tripleaxel", 120],
  ["rockblast", 75],
  ["bulletseed", 75],
  ["scaleshot", 100],
]);

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

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getEffectiveDamagePower(move: MoveEntry) {
  return EFFECTIVE_POWER_OVERRIDES.get(normalizeId(move.name)) ?? move.basePower;
}

function rankUsageMap(map: RankedUsageMap | undefined) {
  return Object.entries(map ?? {}).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args.set(token, "true");
      continue;
    }

    args.set(token, next);
    index += 1;
  }

  return args;
}

async function readJson<T>(filepath: string): Promise<T> {
  const content = await readFile(filepath, "utf8");
  return JSON.parse(content) as T;
}

async function maybeReadJson<T>(filepath: string): Promise<T | null> {
  try {
    return await readJson<T>(filepath);
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function buildPokemonIdIndex(
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

function buildMoveIndex(moveData: MoveEntry[]) {
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

function getUsageWeight(stats: SmogonPokemonStats) {
  return (
    stats.usage?.weighted ??
    stats.usage?.real ??
    stats.usage?.raw ??
    0
  );
}

function resolveLatestVgcFormat(index: StatsIndexResponse, requestedFormat?: string) {
  if (requestedFormat) {
    return requestedFormat.replace(/\.json$/i, "");
  }

  const candidates = Object.keys(index)
    .map((filename) => filename.replace(/\.json$/i, ""))
    .filter((format) => /^gen9vgc\d{4}$/i.test(format))
    .sort((left, right) => right.localeCompare(left, "en"));

  if (!candidates.length) {
    throw new Error("No gen9vgc formats found in the Smogon stats index.");
  }

  return candidates[0];
}

function resolveDefaultItem(
  stats: SmogonPokemonStats,
  previousProfile: VgcMetaProfile | undefined,
) {
  const rankedItems = rankUsageMap(stats.items)
    .map(([itemName]) => itemName)
    .filter((itemName) => normalizeId(itemName) !== "nothing");

  return rankedItems[0] ?? previousProfile?.defaultItem ?? null;
}

function resolveDefaultAbility(
  stats: SmogonPokemonStats,
  pokemon: PokemonEntry,
  previousProfile: VgcMetaProfile | undefined,
) {
  const rankedAbilities = rankUsageMap(stats.abilities).map(([abilityName]) => abilityName);

  return rankedAbilities[0] ?? previousProfile?.defaultAbility ?? pokemon.abilities[0] ?? null;
}

function resolveMoveProfile(
  stats: SmogonPokemonStats,
  pokemon: PokemonEntry,
  moveIndex: Map<string, MoveEntry>,
  previousProfile: VgcMetaProfile | undefined,
  commonMoveLimit: number,
) {
  const rankedResolvedMoves = rankUsageMap(stats.moves)
    .map(([moveName, usage]) => {
      const move = moveIndex.get(compactAlias(moveName));

      if (!move) {
        return null;
      }

      return {
        move,
        usage,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        move: MoveEntry;
        usage: number;
      } => Boolean(entry),
    );

  const damagingMoves = rankedResolvedMoves.filter(
    ({ move }) => move.basePower > 0 && move.category !== "Status",
  );
  const pool = damagingMoves.length ? damagingMoves : rankedResolvedMoves;
  const highPowerPool = pool.filter(
    ({ move }) => getEffectiveDamagePower(move) >= HIGH_DAMAGE_THRESHOLD,
  );
  const mediumPowerPool = pool.filter(
    ({ move }) => getEffectiveDamagePower(move) >= MEDIUM_DAMAGE_THRESHOLD,
  );
  const powerPool =
    highPowerPool.length > 0
      ? highPowerPool
      : mediumPowerPool.length > 0
        ? mediumPowerPool
        : pool;
  const stabPowerPool = powerPool.filter(({ move }) => pokemon.types.includes(move.type));
  const defaultMovePool = stabPowerPool.length > 0 ? stabPowerPool : powerPool;

  const defaultMoveCandidate = [...defaultMovePool].sort((left, right) => {
    if (right.usage !== left.usage) {
      return right.usage - left.usage;
    }

    const powerDelta =
      getEffectiveDamagePower(right.move) - getEffectiveDamagePower(left.move);

    if (powerDelta !== 0) {
      return powerDelta;
    }

    return left.move.name.localeCompare(right.move.name);
  })[0];

  const defaultMove = defaultMoveCandidate?.move.name ?? previousProfile?.defaultMove ?? null;

  const commonMoves = dedupeStrings([
    ...(defaultMove ? [defaultMove] : []),
    ...pool.map(({ move }) => move.name),
    ...(previousProfile?.commonMoves ?? []),
  ]).slice(0, commonMoveLimit);

  return {
    defaultMove,
    commonMoves,
  };
}

function resolveCommonAbilities(
  stats: SmogonPokemonStats,
  pokemon: PokemonEntry,
  previousProfile: VgcMetaProfile | undefined,
  commonAbilityLimit: number,
) {
  return dedupeStrings([
    ...rankUsageMap(stats.abilities).map(([abilityName]) => abilityName),
    ...(previousProfile?.commonAbilities ?? []),
    ...pokemon.abilities,
  ]).slice(0, commonAbilityLimit);
}

function mergeProfile(
  derivedProfile: VgcMetaProfile,
  override: Partial<VgcMetaProfile> | undefined,
) {
  if (!override) {
    return derivedProfile;
  }

  return {
    ...derivedProfile,
    ...override,
    commonMoves: override.commonMoves ?? derivedProfile.commonMoves,
    commonAbilities: override.commonAbilities ?? derivedProfile.commonAbilities,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, "src", "data");
  const outputPath = path.join(dataDir, "vgc-meta.json");
  const overridesPath = path.join(dataDir, "vgc-meta.overrides.json");

  const overrides =
    (await maybeReadJson<VgcMetaOverrides>(overridesPath)) ??
    ({
      speciesIdOverrides: {},
      profileOverrides: {},
    } satisfies VgcMetaOverrides);

  const requestedFormat = args.get("--format") ?? overrides.format;
  const minWeightedUsage = Number(
    args.get("--min-usage") ?? overrides.minWeightedUsage ?? DEFAULT_MIN_WEIGHTED_USAGE,
  );
  const commonMoveLimit = Number(
    args.get("--top-moves") ?? overrides.commonMoveLimit ?? DEFAULT_COMMON_MOVE_LIMIT,
  );
  const commonAbilityLimit = Number(
    args.get("--top-abilities") ??
      overrides.commonAbilityLimit ??
      DEFAULT_COMMON_ABILITY_LIMIT,
  );

  const [pokemonData, moveData, formAliasData, previousMeta] = await Promise.all([
    readJson<PokemonEntry[]>(path.join(dataDir, "pokemon.gen9.json")),
    readJson<MoveEntry[]>(path.join(dataDir, "moves.gen9.json")),
    readJson<FormAliasEntry[]>(path.join(dataDir, "form-aliases.json")),
    maybeReadJson<VgcMetaProfile[]>(outputPath),
  ]);

  const previousMetaByPokemonId = new Map(
    (previousMeta ?? []).map((profile) => [profile.pokemonId, profile]),
  );
  const pokemonById = new Map(pokemonData.map((entry) => [entry.id, entry]));
  const pokemonIdIndex = buildPokemonIdIndex(
    pokemonData,
    formAliasData,
    overrides.speciesIdOverrides ?? {},
  );
  const moveIndex = buildMoveIndex(moveData);

  const statsIndex = await fetchJson<StatsIndexResponse>(`${SMOGON_STATS_BASE_URL}/index.json`);
  const resolvedFormat = resolveLatestVgcFormat(statsIndex, requestedFormat);
  const stats = await fetchJson<SmogonStatsResponse>(
    `${SMOGON_STATS_BASE_URL}/${resolvedFormat}.json`,
  );

  const profilesWithUsage: Array<{ usage: number; profile: VgcMetaProfile }> = [];
  const unresolvedSpecies: string[] = [];
  const skippedSpecies: string[] = [];

  for (const [speciesName, speciesStats] of Object.entries(stats.pokemon)) {
    const usage = getUsageWeight(speciesStats);

    if (usage < minWeightedUsage) {
      continue;
    }

    const pokemonId = pokemonIdIndex.get(compactAlias(speciesName));

    if (!pokemonId) {
      unresolvedSpecies.push(speciesName);
      continue;
    }

    const pokemon = pokemonById.get(pokemonId);

    if (!pokemon) {
      unresolvedSpecies.push(`${speciesName} -> ${pokemonId}`);
      continue;
    }

    const previousProfile = previousMetaByPokemonId.get(pokemonId);
    const defaultItem = resolveDefaultItem(speciesStats, previousProfile);
    const defaultAbility = resolveDefaultAbility(speciesStats, pokemon, previousProfile);
    const { defaultMove, commonMoves } = resolveMoveProfile(
      speciesStats,
      pokemon,
      moveIndex,
      previousProfile,
      commonMoveLimit,
    );
    const commonAbilities = resolveCommonAbilities(
      speciesStats,
      pokemon,
      previousProfile,
      commonAbilityLimit,
    );

    if (!defaultItem || !defaultAbility || !defaultMove) {
      skippedSpecies.push(speciesName);
      continue;
    }

    const mergedProfile = mergeProfile(
      {
        pokemonId,
        defaultItem,
        defaultAbility,
        defaultMove,
        commonMoves,
        commonAbilities,
      },
      overrides.profileOverrides?.[pokemonId],
    );

    profilesWithUsage.push({
      usage,
      profile: {
        ...mergedProfile,
        commonMoves: dedupeStrings(mergedProfile.commonMoves ?? []).slice(0, commonMoveLimit),
        commonAbilities: dedupeStrings(mergedProfile.commonAbilities ?? []).slice(
          0,
          commonAbilityLimit,
        ),
      },
    });
  }

  const nextMeta = profilesWithUsage
    .sort((left, right) => {
      if (right.usage !== left.usage) {
        return right.usage - left.usage;
      }

      return left.profile.pokemonId.localeCompare(right.profile.pokemonId);
    })
    .map(({ profile }) => profile);

  await mkdir(dataDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextMeta, null, 2)}\n`, "utf8");

  console.log(
    [
      `Generated ${nextMeta.length} VGC meta profiles from ${resolvedFormat}.json.`,
      `Minimum weighted usage: ${minWeightedUsage}.`,
      unresolvedSpecies.length
        ? `Unresolved species (${unresolvedSpecies.length}): ${unresolvedSpecies.join(", ")}`
        : "Unresolved species: none.",
      skippedSpecies.length
        ? `Skipped species without complete move/item/ability data (${skippedSpecies.length}): ${skippedSpecies.join(", ")}`
        : "Skipped species without complete move/item/ability data: none.",
    ].join("\n"),
  );
}

void main();
