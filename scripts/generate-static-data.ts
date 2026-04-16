import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";
import regulationMA from "../src/data/regulations/regulation-m-a.json";

type PokemonEntry = {
  id: string;
  name: string;
  aliases: string[];
  types: string[];
  abilities: string[];
  isMega?: boolean;
  requiredItem?: string;
  baseSpeciesId?: string;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  defaultFormOf?: string;
};

type MoveEntry = {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  category: string;
  basePower: number;
  accuracy: number | null;
  target: string;
  isSpread: boolean;
};

type LearnsetEntry = {
  pokemonId: string;
  moveIds: string[];
};

type ItemEntry = {
  id: string;
  name: string;
};

type SpeciesSource = {
  id: string;
  name: string;
  baseSpecies: string;
  baseSpeciesId?: string;
  types: string[];
  abilities: Record<string, string | undefined>;
  isMega?: boolean;
  requiredItem?: string;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
};

const PIKALYTICS_AI_BASE_URL = "https://www.pikalytics.com/ai/pokedex";
const DEFAULT_CHAMPIONS_FORMAT = "championspreview";
const SEREBII_CHAMPIONS_MEGA_ABILITIES_URL =
  "https://www.serebii.net/pokemonchampions/megaabilities.shtml";
const SEREBII_CHAMPIONS_ITEMS_URL =
  "https://www.serebii.net/pokemonchampions/items.shtml";
const EXTRA_SPECIES_NAMES = ["Floette-Eternal"];
const SPECIAL_BASE_SPECIES_IDS = new Map<string, string>([
  ["floettemega", "floetteeternal"],
]);
const MIN_POKEMON_ENTRY_COUNT = 400;
const MIN_MOVE_ENTRY_COUNT = 200;
const MIN_LEARNSET_ENTRY_COUNT = 350;
const MIN_ITEM_ENTRY_COUNT = 50;
const MAX_ENTRY_COUNT_DELTA = 75;

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

function aliasVariants(value: string) {
  const normalized = normalizeAlias(value);
  const compact = compactAlias(value);

  return Array.from(
    new Set(
      [value.toLowerCase(), normalized, compact]
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  );
}

function megaAliasVariants(species: SpeciesSource) {
  if (!species.isMega) {
    return [];
  }

  const suffix = species.name
    .replace(new RegExp(`^${species.baseSpecies}-?`, "i"), "")
    .replace(/^mega-?/i, "")
    .trim();
  const normalizedSuffix = normalizeAlias(suffix);
  const suffixTokens = normalizedSuffix ? ` ${normalizedSuffix}` : "";

  return Array.from(
    new Set(
      [
        `mega ${species.baseSpecies}${suffixTokens}`,
        `${species.baseSpecies} mega${suffixTokens}`,
      ]
        .flatMap((alias) => aliasVariants(alias))
        .filter(Boolean),
    ),
  );
}

function specialAliasVariants(species: SpeciesSource) {
  if (species.id === "floetteeternal") {
    return Array.from(
      new Set(
        [
          "floette eternal",
          "floette eternal flower",
          "eternal floette",
          "eternal flower floette",
        ].flatMap((alias) => aliasVariants(alias)),
      ),
    );
  }

  return [] as string[];
}

function shouldAddBaseSpeciesAliases(species: SpeciesSource) {
  if (species.id === "floetteeternal") {
    return false;
  }

  return (
    species.baseSpecies &&
    species.baseSpecies !== species.name &&
    !species.isMega
  );
}

function buildSpeciesIdIndex(speciesPool: Iterable<SpeciesSource>) {
  const index = new Map<string, string>();

  for (const species of speciesPool) {
    const aliases = new Set<string>();

    for (const alias of aliasVariants(species.name)) {
      aliases.add(alias);
    }

    for (const alias of megaAliasVariants(species)) {
      aliases.add(alias);
    }

    for (const alias of specialAliasVariants(species)) {
      aliases.add(alias);
    }

    if (shouldAddBaseSpeciesAliases(species)) {
      for (const alias of aliasVariants(species.baseSpecies)) {
        aliases.add(alias);
      }
    }

    aliases.add(species.id);

    for (const alias of aliases) {
      const normalized = compactAlias(alias);

      if (!normalized || index.has(normalized)) {
        continue;
      }

      index.set(normalized, species.id);
    }
  }

  return index;
}

function parseChampionsMegaAbilities(markdownOrHtml: string) {
  const megaAbilities = new Map<string, string>();
  const matcher =
    /<a href="\/pokedex-champions\/[^"]+\/">(Mega [^<]+)<\/a>[\s\S]*?<a href="\/abilitydex\/[^"]+\.shtml">([^<]+)<\/a>/g;

  for (const match of markdownOrHtml.matchAll(matcher)) {
    megaAbilities.set(match[1].trim(), match[2].trim());
  }

  return megaAbilities;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseChampionsItems(html: string) {
  const legalSection =
    html.split(/<u>\s*Miscellaneous Items\s*<\/u>/i)[0] ?? html;
  const items = new Map<string, string>();
  const matcher =
    /<td class="fooinfo"><a href="\/itemdex\/([a-z0-9-]+)\.shtml">([^<]+)<\/a><\/td>/gi;

  for (const match of legalSection.matchAll(matcher)) {
    const name = decodeHtmlEntities(match[2] ?? "");
    if (!name) {
      continue;
    }

    items.set(normalizeAlias(name).replace(/\s+/g, ""), name);
  }

  if (items.size === 0) {
    throw new Error("Failed to parse Champions legal items from Serebii.");
  }

  return Array.from(items.entries())
    .map(([id, name]) => ({ id, name }) satisfies ItemEntry)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "omniboost-static-data-generator/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function parseIndexSpeciesNames(markdown: string) {
  const names: string[] = [];
  const matcher =
    /^\|\s*\d+\s*\|\s*\*\*(.+?)\*\*\s*\|\s*[\d.]+%\s*\|\s*\[View\]\(.+?\)\s*\|\s*\[AI\]\(.+?\)\s*\|$/gm;

  for (const match of markdown.matchAll(matcher)) {
    names.push(match[1].trim());
  }

  return names;
}

function toSpeciesSource(species: {
  id: string;
  name: string;
  baseSpecies: string;
  types: readonly string[];
  abilities: unknown;
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
}): SpeciesSource {
  const defaultBaseSpeciesId = Dex.species.get(species.baseSpecies).id;
  const baseSpeciesId =
    SPECIAL_BASE_SPECIES_IDS.get(species.id) ?? defaultBaseSpeciesId;

  return {
    id: species.id,
    name: species.name,
    baseSpecies: species.baseSpecies,
    baseSpeciesId,
    types: [...species.types],
    abilities: Object.fromEntries(
      Object.entries(species.abilities as Record<string, string | undefined>),
    ),
    isMega:
      "isMega" in species
        ? Boolean((species as { isMega?: boolean }).isMega)
        : false,
    requiredItem:
      "requiredItems" in species
        ? ((species as { requiredItems?: string[] }).requiredItems?.[0] ??
          undefined)
        : "requiredItem" in species
          ? ((species as { requiredItem?: string }).requiredItem ?? undefined)
          : undefined,
    baseStats: { ...species.baseStats },
  };
}

function resolveLearnsetSpecies(
  gen: ReturnType<Generations["get"]>,
  species: PokemonEntry,
) {
  const visited = new Set<string>();
  let currentId: string | undefined = species.id;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const current = Dex.species.get(currentId);

    if (!current.exists) {
      break;
    }

    const genSpecies = gen.species.get(current.name);
    if (genSpecies) {
      return genSpecies;
    }

    currentId =
      SPECIAL_BASE_SPECIES_IDS.get(current.id) ??
      (current.baseSpecies
        ? Dex.species.get(current.baseSpecies).id
        : undefined);
  }

  return null;
}

async function readExistingJson<T>(filepath: string): Promise<T | null> {
  try {
    const content = await readFile(filepath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function assertUniqueIds<T extends { id: string }>(
  entries: T[],
  label: string,
) {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate ${label} id detected: ${entry.id}`);
    }

    seen.add(entry.id);
  }
}

function validatePokemonEntries(entries: PokemonEntry[]) {
  if (entries.length < MIN_POKEMON_ENTRY_COUNT) {
    throw new Error(
      `Generated only ${entries.length} pokemon entries; expected at least ${MIN_POKEMON_ENTRY_COUNT}.`,
    );
  }

  assertUniqueIds(entries, "pokemon");

  for (const entry of entries) {
    if (!entry.name.trim()) {
      throw new Error(`Pokemon entry ${entry.id} is missing a display name.`);
    }

    if (!entry.aliases.length) {
      throw new Error(`Pokemon entry ${entry.id} is missing aliases.`);
    }

    if (!entry.types.length) {
      throw new Error(`Pokemon entry ${entry.id} is missing types.`);
    }

    if (!entry.abilities.length) {
      throw new Error(`Pokemon entry ${entry.id} is missing abilities.`);
    }

    const stats = Object.entries(entry.baseStats);
    const hasInvalidStat = stats.some(
      ([, value]) => !Number.isInteger(value) || value <= 0,
    );

    if (hasInvalidStat) {
      throw new Error(`Pokemon entry ${entry.id} has invalid base stats.`);
    }
  }
}

function validateMoveEntries(entries: MoveEntry[]) {
  if (entries.length < MIN_MOVE_ENTRY_COUNT) {
    throw new Error(
      `Generated only ${entries.length} move entries; expected at least ${MIN_MOVE_ENTRY_COUNT}.`,
    );
  }

  assertUniqueIds(entries, "move");

  for (const entry of entries) {
    if (!entry.name.trim()) {
      throw new Error(`Move entry ${entry.id} is missing a display name.`);
    }

    if (!entry.type.trim()) {
      throw new Error(`Move entry ${entry.id} is missing a type.`);
    }

    if (!entry.category.trim()) {
      throw new Error(`Move entry ${entry.id} is missing a category.`);
    }

    if (!Number.isFinite(entry.basePower) || entry.basePower < 0) {
      throw new Error(`Move entry ${entry.id} has invalid base power.`);
    }
  }
}

function validateLearnsetEntries(
  entries: LearnsetEntry[],
  pokemonEntries: PokemonEntry[],
  moveEntries: MoveEntry[],
) {
  if (entries.length < MIN_LEARNSET_ENTRY_COUNT) {
    throw new Error(
      `Generated only ${entries.length} learnset entries; expected at least ${MIN_LEARNSET_ENTRY_COUNT}.`,
    );
  }

  const pokemonIds = new Set(pokemonEntries.map((entry) => entry.id));
  const moveIds = new Set(moveEntries.map((entry) => entry.id));
  const seenPokemonIds = new Set<string>();

  for (const entry of entries) {
    if (!pokemonIds.has(entry.pokemonId)) {
      throw new Error(
        `Learnset entry references unknown pokemon id: ${entry.pokemonId}`,
      );
    }

    if (seenPokemonIds.has(entry.pokemonId)) {
      throw new Error(
        `Duplicate learnset entry detected for pokemon id: ${entry.pokemonId}`,
      );
    }

    seenPokemonIds.add(entry.pokemonId);

    for (const moveId of entry.moveIds) {
      if (!moveIds.has(moveId)) {
        throw new Error(
          `Learnset entry ${entry.pokemonId} references unknown move id: ${moveId}`,
        );
      }
    }
  }
}

function validateItemEntries(entries: ItemEntry[]) {
  if (entries.length < MIN_ITEM_ENTRY_COUNT) {
    throw new Error(
      `Generated only ${entries.length} item entries; expected at least ${MIN_ITEM_ENTRY_COUNT}.`,
    );
  }

  assertUniqueIds(entries, "item");

  for (const entry of entries) {
    if (!entry.name.trim()) {
      throw new Error(`Item entry ${entry.id} is missing a display name.`);
    }
  }
}

function validateGeneratedData(
  pokemonEntries: PokemonEntry[],
  moveEntries: MoveEntry[],
  learnsetEntries: LearnsetEntry[],
  itemEntries: ItemEntry[],
) {
  validatePokemonEntries(pokemonEntries);
  validateMoveEntries(moveEntries);
  validateLearnsetEntries(learnsetEntries, pokemonEntries, moveEntries);
  validateItemEntries(itemEntries);
}

function warnOnLargeCountDelta(
  label: string,
  previousCount: number | null,
  nextCount: number,
) {
  if (previousCount === null) {
    return;
  }

  const delta = Math.abs(previousCount - nextCount);

  if (delta > MAX_ENTRY_COUNT_DELTA) {
    console.warn(
      `[warn] ${label} count changed by ${delta} entries (${previousCount} -> ${nextCount}).`,
    );
  }
}

async function main() {
  const gens = new Generations(Dex);
  const gen = gens.get(9);
  const dataDir = path.join(process.cwd(), "src", "data");
  const championsIndexMarkdown = await fetchText(
    `${PIKALYTICS_AI_BASE_URL}/${DEFAULT_CHAMPIONS_FORMAT}`,
  );
  const championsMegaAbilitiesHtml = await fetchText(
    SEREBII_CHAMPIONS_MEGA_ABILITIES_URL,
  );
  const championsItemsHtml = await fetchText(SEREBII_CHAMPIONS_ITEMS_URL);
  const championSpeciesNames = parseIndexSpeciesNames(championsIndexMarkdown);
  const itemEntries = parseChampionsItems(championsItemsHtml);

  await mkdir(dataDir, { recursive: true });

  const pokemonEntries: PokemonEntry[] = [];
  const speciesPool = new Map<string, SpeciesSource>();

  for (const species of gen.species) {
    speciesPool.set(species.id, toSpeciesSource(species));
  }

  for (const species of Dex.species.all()) {
    if (!species.exists || !species.isMega) {
      continue;
    }

    speciesPool.set(species.id, toSpeciesSource(species));
  }

  for (const speciesName of championSpeciesNames) {
    const species = Dex.species.get(speciesName);

    if (!species.exists) {
      continue;
    }

    speciesPool.set(species.id, toSpeciesSource(species));
  }

  for (const speciesName of EXTRA_SPECIES_NAMES) {
    const species = Dex.species.get(speciesName);

    if (!species.exists) {
      continue;
    }

    speciesPool.set(species.id, toSpeciesSource(species));
  }

  for (const pokemonId of regulationMA.allowedPokemonIds) {
    const species = Dex.species.get(pokemonId);

    if (!species.exists) {
      continue;
    }

    speciesPool.set(species.id, toSpeciesSource(species));
  }

  const speciesIdIndex = buildSpeciesIdIndex(speciesPool.values());
  const championsMegaAbilities = parseChampionsMegaAbilities(
    championsMegaAbilitiesHtml,
  );

  for (const [displayName, abilityName] of championsMegaAbilities) {
    const speciesId = speciesIdIndex.get(compactAlias(displayName));

    if (!speciesId) {
      continue;
    }

    const species = speciesPool.get(speciesId);

    if (!species?.isMega) {
      continue;
    }

    species.abilities = {
      0: abilityName,
    };
  }

  for (const species of speciesPool.values()) {
    const aliases = new Set<string>();

    for (const alias of aliasVariants(species.name)) {
      aliases.add(alias);
    }

    for (const alias of megaAliasVariants(species)) {
      aliases.add(alias);
    }

    for (const alias of specialAliasVariants(species)) {
      aliases.add(alias);
    }

    if (shouldAddBaseSpeciesAliases(species)) {
      for (const alias of aliasVariants(species.baseSpecies)) {
        aliases.add(alias);
      }
    }

    if (species.id === "floetteeternal") {
      aliases.delete("floette");
    }

    pokemonEntries.push({
      id: species.id,
      name: species.name,
      aliases: Array.from(aliases).sort(),
      types: [...species.types],
      abilities: Object.values(species.abilities).filter(
        (ability): ability is string => Boolean(ability),
      ),
      isMega: species.isMega,
      requiredItem: species.requiredItem,
      baseSpeciesId: species.baseSpeciesId,
      baseStats: {
        hp: species.baseStats.hp,
        atk: species.baseStats.atk,
        def: species.baseStats.def,
        spa: species.baseStats.spa,
        spd: species.baseStats.spd,
        spe: species.baseStats.spe,
      },
      defaultFormOf:
        species.baseSpecies && species.baseSpecies !== species.name
          ? normalizeAlias(species.baseSpecies).replace(/\s+/g, "")
          : undefined,
    });
  }

  pokemonEntries.sort((a, b) => a.name.localeCompare(b.name));

  const moveEntries: MoveEntry[] = [];

  for (const move of gen.moves) {
    moveEntries.push({
      id: move.id,
      name: move.name,
      aliases: aliasVariants(move.name),
      type: move.type,
      category: move.category,
      basePower: move.basePower,
      accuracy: typeof move.accuracy === "number" ? move.accuracy : null,
      target: move.target,
      isSpread: ["allAdjacent", "allAdjacentFoes"].includes(move.target),
    });
  }

  moveEntries.sort((a, b) => a.name.localeCompare(b.name));

  const learnsetEntries: LearnsetEntry[] = [];

  for (const species of pokemonEntries) {
    const moveIds = new Set<string>();
    const speciesEntry = resolveLearnsetSpecies(gen, species);

    if (!speciesEntry) {
      continue;
    }

    for await (const learnset of gen.learnsets.all(speciesEntry)) {
      if (!learnset.learnset) {
        continue;
      }

      for (const moveId of Object.keys(learnset.learnset)) {
        moveIds.add(moveId);
      }
    }

    learnsetEntries.push({
      pokemonId: species.id,
      moveIds: Array.from(moveIds).sort(),
    });
  }

  learnsetEntries.sort((a, b) => a.pokemonId.localeCompare(b.pokemonId));

  validateGeneratedData(
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    itemEntries,
  );

  const previousPokemonEntries = await readExistingJson<PokemonEntry[]>(
    path.join(dataDir, "pokemon.gen9.json"),
  );
  const previousMoveEntries = await readExistingJson<MoveEntry[]>(
    path.join(dataDir, "moves.gen9.json"),
  );
  const previousLearnsetEntries = await readExistingJson<LearnsetEntry[]>(
    path.join(dataDir, "learnsets.gen9.json"),
  );
  const previousItemEntries = await readExistingJson<ItemEntry[]>(
    path.join(dataDir, "champions-items.json"),
  );

  warnOnLargeCountDelta(
    "pokemon",
    previousPokemonEntries?.length ?? null,
    pokemonEntries.length,
  );
  warnOnLargeCountDelta(
    "moves",
    previousMoveEntries?.length ?? null,
    moveEntries.length,
  );
  warnOnLargeCountDelta(
    "learnsets",
    previousLearnsetEntries?.length ?? null,
    learnsetEntries.length,
  );
  warnOnLargeCountDelta(
    "champions-items",
    previousItemEntries?.length ?? null,
    itemEntries.length,
  );

  const writeJson = async (filename: string, data: unknown) => {
    const target = path.join(dataDir, filename);
    await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  };

  await writeJson("pokemon.gen9.json", pokemonEntries);
  await writeJson("moves.gen9.json", moveEntries);
  await writeJson("learnsets.gen9.json", learnsetEntries);
  await writeJson("champions-items.json", itemEntries);
}

void main();
