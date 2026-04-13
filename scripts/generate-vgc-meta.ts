import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type PokemonEntry = {
  id: string;
  name: string;
  aliases: string[];
  types: string[];
  abilities: string[];
  isMega?: boolean;
  requiredItem?: string;
  baseSpeciesId?: string;
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

type ItemEntry = {
  id: string;
  name: string;
};

type VgcMetaProfile = {
  pokemonId: string;
  defaultItem: string;
  defaultAbility: string;
  defaultMove: string;
  commonMoves?: string[];
  commonAbilities?: string[];
  commonItems?: string[];
};

type VgcMetaOverrides = {
  format?: string;
  minUsageFraction?: number;
  minWeightedUsage?: number;
  commonMoveLimit?: number;
  commonAbilityLimit?: number;
  commonItemLimit?: number;
  speciesIdOverrides?: Record<string, string>;
  profileOverrides?: Record<string, Partial<VgcMetaProfile>>;
};

type UsageEntry = {
  name: string;
  usage: number;
};

type PikalyticsIndexEntry = {
  speciesName: string;
  usagePercent: number;
  aiUrl: string;
  webUrl: string;
};

const PIKALYTICS_AI_BASE_URL = "https://www.pikalytics.com/ai/pokedex";
const DEFAULT_FORMAT = "championspreview";
const DEFAULT_MIN_USAGE_FRACTION = 0.001;
const DEFAULT_COMMON_MOVE_LIMIT = 8;
const DEFAULT_COMMON_ABILITY_LIMIT = 3;
const DEFAULT_COMMON_ITEM_LIMIT = 6;
const DOMINANT_UNMATCHED_ABILITY_USAGE_PERCENT = 5;
const HIGH_DAMAGE_THRESHOLD = 90;
const MEDIUM_DAMAGE_THRESHOLD = 70;
const REQUEST_CONCURRENCY = 6;

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

function dedupeStrings(values: Array<string | null | undefined>) {
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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getEffectiveDamagePower(move: MoveEntry) {
  return EFFECTIVE_POWER_OVERRIDES.get(normalizeId(move.name)) ?? move.basePower;
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

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "omniboost-meta-generator/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
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

function buildMegaEvolutionIndex(pokemonData: PokemonEntry[]) {
  return new Map(
    pokemonData
      .filter(
        (entry) => entry.isMega && entry.requiredItem && entry.baseSpeciesId,
      )
      .map((entry) => [
        `${entry.baseSpeciesId}:${normalizeId(entry.requiredItem!)}`,
        entry,
      ] as const),
  );
}

function extractMarkdownSection(markdown: string, heading: string) {
  const match = markdown.match(
    new RegExp(`## ${escapeRegex(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |\\r?\\n---|$)`),
  );

  return match?.[1]?.trim() ?? "";
}

function parseUsageEntries(sectionMarkdown: string) {
  const entries: UsageEntry[] = [];
  const matcher = /^- \*\*(.+?)\*\*: ([\d.]+)%$/gm;

  for (const match of sectionMarkdown.matchAll(matcher)) {
    entries.push({
      name: match[1].trim(),
      usage: Number(match[2]),
    });
  }

  return entries;
}

function parseIndexEntries(markdown: string) {
  const entries: PikalyticsIndexEntry[] = [];
  const matcher =
    /^\|\s*\d+\s*\|\s*\*\*(.+?)\*\*\s*\|\s*([\d.]+)%\s*\|\s*\[View\]\((.+?)\)\s*\|\s*\[AI\]\((.+?)\)\s*\|$/gm;

  for (const match of markdown.matchAll(matcher)) {
    entries.push({
      speciesName: match[1].trim(),
      usagePercent: Number(match[2]),
      webUrl: match[3],
      aiUrl: match[4],
    });
  }

  return entries;
}

function parseFormatDataDate(markdown: string) {
  const match = markdown.match(/- \*\*Data Date\*\*: ([\d-]+)/);
  return match?.[1] ?? null;
}

function resolveDefaultItem(
  rankedItems: UsageEntry[],
  previousProfile: VgcMetaProfile | undefined,
  commonItemLimit: number,
  legalItemById: Map<string, string>,
) {
  const legalRankedItems = rankedItems
    .map((entry) => canonicalizeLegalItemName(entry.name.trim(), legalItemById))
    .filter((itemName): itemName is string => Boolean(itemName));
  const previousItems = [
    ...(previousProfile?.commonItems ?? []),
    previousProfile?.defaultItem,
  ]
    .map((itemName) => canonicalizeLegalItemName(itemName, legalItemById))
    .filter((itemName): itemName is string => Boolean(itemName));
  const commonItems = dedupeStrings([
    ...legalRankedItems,
    ...previousItems,
  ]).slice(0, commonItemLimit);

  return {
    defaultItem: commonItems[0] ?? null,
    commonItems,
  };
}

function resolveDefaultAbility(
  rankedAbilities: UsageEntry[],
  pokemon: PokemonEntry,
  previousProfile: VgcMetaProfile | undefined,
  commonAbilityLimit: number,
) {
  const speciesAbilityById = new Map(
    pokemon.abilities.map((ability) => [normalizeId(ability), ability]),
  );
  const matchedSpeciesAbilities = rankedAbilities
    .map((entry) => ({
      usage: entry.usage,
      ability: speciesAbilityById.get(normalizeId(entry.name)),
    }))
    .filter(
      (
        entry,
      ): entry is {
        usage: number;
        ability: string;
      } => Boolean(entry.ability),
    );
  const topRankedAbility = rankedAbilities[0]?.name ?? null;
  const topRankedMatchesSpecies = topRankedAbility
    ? speciesAbilityById.has(normalizeId(topRankedAbility))
    : false;
  const dominantUnmatchedAbility =
    topRankedAbility &&
    !topRankedMatchesSpecies &&
    rankedAbilities[0]!.usage >= DOMINANT_UNMATCHED_ABILITY_USAGE_PERCENT &&
    (matchedSpeciesAbilities.length === 0 ||
      rankedAbilities[0]!.usage >= matchedSpeciesAbilities[0]!.usage * 3)
      ? topRankedAbility
      : null;
  const defaultAbility =
    dominantUnmatchedAbility ??
    matchedSpeciesAbilities[0]?.ability ??
    pokemon.abilities[0] ??
    previousProfile?.defaultAbility ??
    topRankedAbility;
  const commonAbilities = dedupeStrings([
    defaultAbility,
    ...matchedSpeciesAbilities.map((entry) => entry.ability),
    dominantUnmatchedAbility,
    ...pokemon.abilities,
    ...(previousProfile?.commonAbilities ?? []),
  ]).slice(0, commonAbilityLimit);

  return {
    defaultAbility,
    commonAbilities,
  };
}

function resolveMoveProfile(
  rankedMoves: UsageEntry[],
  pokemon: PokemonEntry,
  moveIndex: Map<string, MoveEntry>,
  previousProfile: VgcMetaProfile | undefined,
  commonMoveLimit: number,
) {
  const rankedResolvedMoves = rankedMoves
    .map((entry) => {
      const move = moveIndex.get(compactAlias(entry.name));

      if (!move) {
        return null;
      }

      return {
        move,
        usage: entry.usage,
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
    defaultMove,
    ...rankedResolvedMoves.map(({ move }) => move.name),
    ...(previousProfile?.commonMoves ?? []),
  ]).slice(0, commonMoveLimit);

  return {
    defaultMove,
    commonMoves,
  };
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
    commonItems: override.commonItems ?? derivedProfile.commonItems,
  };
}

function deriveMegaProfile(
  profile: VgcMetaProfile,
  pokemon: PokemonEntry,
  megaEvolutionIndex: Map<string, PokemonEntry>,
  override: Partial<VgcMetaProfile> | undefined,
) {
  const megaPokemon = megaEvolutionIndex.get(
    `${pokemon.id}:${normalizeId(profile.defaultItem)}`,
  );

  if (!megaPokemon?.requiredItem) {
    return null;
  }

  return mergeProfile(
    {
      pokemonId: megaPokemon.id,
      defaultItem: megaPokemon.requiredItem,
      defaultAbility: megaPokemon.abilities[0] ?? profile.defaultAbility,
      defaultMove: profile.defaultMove,
      commonMoves: [...(profile.commonMoves ?? [])],
      commonAbilities: dedupeStrings([
        megaPokemon.abilities[0],
        ...megaPokemon.abilities,
      ]),
      commonItems: [megaPokemon.requiredItem],
    },
    override,
  );
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<U>,
) {
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
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

  const resolvedFormat = args.get("--format") ?? overrides.format ?? DEFAULT_FORMAT;
  const minUsageFraction = Number(
    args.get("--min-usage") ??
      overrides.minUsageFraction ??
      overrides.minWeightedUsage ??
      DEFAULT_MIN_USAGE_FRACTION,
  );
  const commonMoveLimit = Number(
    args.get("--top-moves") ?? overrides.commonMoveLimit ?? DEFAULT_COMMON_MOVE_LIMIT,
  );
  const commonAbilityLimit = Number(
    args.get("--top-abilities") ??
      overrides.commonAbilityLimit ??
      DEFAULT_COMMON_ABILITY_LIMIT,
  );
  const commonItemLimit = Number(
    args.get("--top-items") ?? overrides.commonItemLimit ?? DEFAULT_COMMON_ITEM_LIMIT,
  );

  const [pokemonData, moveData, formAliasData, legalItemData, previousMeta] = await Promise.all([
    readJson<PokemonEntry[]>(path.join(dataDir, "pokemon.gen9.json")),
    readJson<MoveEntry[]>(path.join(dataDir, "moves.gen9.json")),
    readJson<FormAliasEntry[]>(path.join(dataDir, "form-aliases.json")),
    readJson<ItemEntry[]>(path.join(dataDir, "champions-items.json")),
    maybeReadJson<VgcMetaProfile[]>(outputPath),
  ]);

  const previousMetaByPokemonId = new Map(
    (previousMeta ?? []).map((profile) => [profile.pokemonId, profile]),
  );
  const pokemonById = new Map(pokemonData.map((entry) => [entry.id, entry]));
  const legalItemById = new Map(legalItemData.map((entry) => [entry.id, entry.name]));
  const pokemonIdIndex = buildPokemonIdIndex(
    pokemonData,
    formAliasData,
    overrides.speciesIdOverrides ?? {},
  );
  const megaEvolutionIndex = buildMegaEvolutionIndex(pokemonData);
  const moveIndex = buildMoveIndex(moveData);

  const indexMarkdown = await fetchText(`${PIKALYTICS_AI_BASE_URL}/${resolvedFormat}`);
  const dataDate = parseFormatDataDate(indexMarkdown);
  const indexEntries = parseIndexEntries(indexMarkdown);

  if (!indexEntries.length) {
    throw new Error(`No Pokemon entries were found at ${PIKALYTICS_AI_BASE_URL}/${resolvedFormat}.`);
  }

  const unresolvedSpecies: string[] = [];
  const skippedSpecies: string[] = [];
  const fetchFailures: string[] = [];

  const profileResults = await mapWithConcurrency(
    indexEntries,
    REQUEST_CONCURRENCY,
    async (entry) => {
      if (entry.usagePercent / 100 < minUsageFraction) {
        return null;
      }

      try {
        const markdown = await fetchText(entry.aiUrl);
        const pokemonId = pokemonIdIndex.get(compactAlias(entry.speciesName));

        if (!pokemonId) {
          unresolvedSpecies.push(entry.speciesName);
          return null;
        }

        const pokemon = pokemonById.get(pokemonId);

        if (!pokemon) {
          unresolvedSpecies.push(`${entry.speciesName} -> ${pokemonId}`);
          return null;
        }

        const previousProfile = previousMetaByPokemonId.get(pokemonId);
        const commonMovesSection = parseUsageEntries(
          extractMarkdownSection(markdown, "Common Moves"),
        );
        const commonAbilitiesSection = parseUsageEntries(
          extractMarkdownSection(markdown, "Common Abilities"),
        );
        const commonItemsSection = parseUsageEntries(
          extractMarkdownSection(markdown, "Common Items"),
        );
        const { defaultItem, commonItems } = resolveDefaultItem(
          commonItemsSection,
          previousProfile,
          commonItemLimit,
          legalItemById,
        );
        const { defaultAbility, commonAbilities } = resolveDefaultAbility(
          commonAbilitiesSection,
          pokemon,
          previousProfile,
          commonAbilityLimit,
        );
        const { defaultMove, commonMoves } = resolveMoveProfile(
          commonMovesSection,
          pokemon,
          moveIndex,
          previousProfile,
          commonMoveLimit,
        );

        if (!defaultItem || !defaultAbility || !defaultMove) {
          skippedSpecies.push(entry.speciesName);
          return null;
        }

        const mergedProfile = mergeProfile(
          {
            pokemonId,
            defaultItem,
            defaultAbility,
            defaultMove,
            commonMoves,
            commonAbilities,
            commonItems,
          },
          overrides.profileOverrides?.[pokemonId],
        );

        return {
          usagePercent: entry.usagePercent,
          profile: {
            ...mergedProfile,
            commonMoves: dedupeStrings(mergedProfile.commonMoves ?? []).slice(0, commonMoveLimit),
            commonAbilities: dedupeStrings(mergedProfile.commonAbilities ?? []).slice(
              0,
              commonAbilityLimit,
            ),
            commonItems: dedupeStrings(mergedProfile.commonItems ?? []).slice(0, commonItemLimit),
          },
        };
      } catch (error) {
        fetchFailures.push(
          `${entry.speciesName}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    },
  );

  const baseProfiles = profileResults
    .filter(
      (
        entry,
      ): entry is NonNullable<(typeof profileResults)[number]> => Boolean(entry),
    )
    .sort((left, right) => {
      if (right.usagePercent !== left.usagePercent) {
        return right.usagePercent - left.usagePercent;
      }

      return left.profile.pokemonId.localeCompare(right.profile.pokemonId);
    });
  const nextMeta = dedupeStrings(
    baseProfiles.flatMap(({ profile }) => {
      const pokemon = pokemonById.get(profile.pokemonId);
      const megaProfile = pokemon
        ? deriveMegaProfile(
            profile,
            pokemon,
            megaEvolutionIndex,
            overrides.profileOverrides?.[
              megaEvolutionIndex.get(`${pokemon.id}:${normalizeId(profile.defaultItem)}`)?.id ?? ""
            ],
          )
        : null;

      return [
        JSON.stringify(profile),
        megaProfile ? JSON.stringify(megaProfile) : null,
      ];
    }),
  )
    .map((profileText) => JSON.parse(profileText) as VgcMetaProfile)
    .sort((left, right) => left.pokemonId.localeCompare(right.pokemonId));

  await mkdir(dataDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextMeta, null, 2)}\n`, "utf8");

  console.log(
    [
      `Generated ${nextMeta.length} Champions meta profiles from Pikalytics format ${resolvedFormat}.`,
      dataDate ? `Data date: ${dataDate}.` : "Data date: unavailable.",
      `Minimum usage fraction: ${minUsageFraction}.`,
      unresolvedSpecies.length
        ? `Unresolved species (${unresolvedSpecies.length}): ${unresolvedSpecies.join(", ")}`
        : "Unresolved species: none.",
      skippedSpecies.length
        ? `Skipped species without complete move/item/ability data (${skippedSpecies.length}): ${skippedSpecies.join(", ")}`
        : "Skipped species without complete move/item/ability data: none.",
      fetchFailures.length
        ? `Fetch failures (${fetchFailures.length}): ${fetchFailures.join(" | ")}`
        : "Fetch failures: none.",
    ].join("\n"),
  );
}

void main();
