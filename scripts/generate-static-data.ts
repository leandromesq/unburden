import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";

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
const EXTRA_SPECIES_NAMES = ["Floette-Eternal"];
const SPECIAL_BASE_SPECIES_IDS = new Map<string, string>([
  ["floettemega", "floetteeternal"],
]);

function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function aliasVariants(value: string) {
  const normalized = normalizeAlias(value);
  const compact = normalized.replace(/\s+/g, "");

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

  return species.baseSpecies && species.baseSpecies !== species.name && !species.isMega;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "omniboost-static-data-generator/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
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
    isMega: "isMega" in species ? Boolean((species as { isMega?: boolean }).isMega) : false,
    requiredItem: "requiredItems" in species
      ? ((species as { requiredItems?: string[] }).requiredItems?.[0] ?? undefined)
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
      (current.baseSpecies ? Dex.species.get(current.baseSpecies).id : undefined);
  }

  return null;
}

async function main() {
  const gens = new Generations(Dex);
  const gen = gens.get(9);
  const dataDir = path.join(process.cwd(), "src", "data");
  const championsIndexMarkdown = await fetchText(
    `${PIKALYTICS_AI_BASE_URL}/${DEFAULT_CHAMPIONS_FORMAT}`,
  );
  const championSpeciesNames = parseIndexSpeciesNames(championsIndexMarkdown);

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

  const writeJson = async (filename: string, data: unknown) => {
    const target = path.join(dataDir, filename);
    await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  };

  await writeJson("pokemon.gen9.json", pokemonEntries);
  await writeJson("moves.gen9.json", moveEntries);
  await writeJson("learnsets.gen9.json", learnsetEntries);
}

void main();
