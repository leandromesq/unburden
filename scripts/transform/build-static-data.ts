import { createHash } from "node:crypto";

import { Dex, type ID, type ModData } from "@pkmn/dex";
import * as championsMod from "@pkmn/mods/champions";

export type PokemonEntry = {
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

export type MoveEntry = {
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

export type LearnsetEntry = {
  pokemonId: string;
  moveIds: string[];
};

export type ItemEntry = {
  id: string;
  name: string;
};

export type RegulationEntry = {
  id: string;
  name: string;
  seasons: string[];
  dateRange: string;
  allowedPokemonIds: string[];
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

const CHAMPIONS_FORMAT_ID = "gen9championsvgc2026regma";
const championsDex = Dex.mod("champions" as ID, championsMod as ModData);
const LOCAL_REGULATION_SPECIES_FIXES = ["floette"];
const SPECIAL_BASE_SPECIES_IDS = new Map<string, string>([
  ["floettemega", "floetteeternal"],
]);
const MEGA_SPECIES_ID_PATTERN = /mega(x|y)?$/i;

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

function isMegaSpecies(species: { id: string; isMega?: boolean }) {
  return Boolean(species.isMega) || MEGA_SPECIES_ID_PATTERN.test(species.id);
}

function isLegalChampionsSpecies(species: {
  exists: boolean;
  tier: string;
  isNonstandard: string | null;
}) {
  return (
    species.exists &&
    !species.isNonstandard &&
    !["CAP", "Illegal", "Unreleased"].includes(species.tier)
  );
}

function isLegalChampionsMove(move: {
  exists: boolean;
  isNonstandard: string | null;
}) {
  return move.exists && !move.isNonstandard;
}

function isLegalChampionsItem(item: {
  exists: boolean;
  isNonstandard: string | null;
  kind: string;
}) {
  return item.exists && !item.isNonstandard && item.kind === "Item";
}

function megaAliasVariants(species: SpeciesSource) {
  if (!species.isMega) {
    return [];
  }

  const lowerName = species.name.toLowerCase();
  const lowerBaseSpecies = species.baseSpecies.toLowerCase();
  const suffix = (
    lowerName.startsWith(`${lowerBaseSpecies}-`)
      ? species.name.slice(species.baseSpecies.length + 1)
      : lowerName.startsWith(lowerBaseSpecies)
        ? species.name.slice(species.baseSpecies.length)
        : species.name
  )
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

function shouldUseGenericMegaAlias(species: SpeciesSource) {
  if (!species.isMega) {
    return false;
  }

  return (
    species.name.match(/-M-Mega$/i) !== null ||
    (species.name.match(/-Mega$/i) !== null &&
      !species.name.match(/-Mega [XY]$/i))
  );
}

function buildSpeciesAliases(
  species: SpeciesSource,
  megaCountByBaseSpecies: Map<string, number>,
) {
  if (species.id === "aegislashblade") {
    return ["aegislashblade"];
  }

  const aliases = new Set<string>();

  if (species.id === "aegislash") {
    for (const alias of aliasVariants("Aegislash-Shield")) {
      aliases.add(alias);
    }
  }

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

  if (
    shouldUseGenericMegaAlias(species) &&
    ((megaCountByBaseSpecies.get(species.baseSpecies) ?? 0) === 1 ||
      species.name.match(/-M-Mega$/i))
  ) {
    for (const alias of aliasVariants(`mega ${species.baseSpecies}`)) {
      aliases.add(alias);
    }

    for (const alias of aliasVariants(`${species.baseSpecies} mega`)) {
      aliases.add(alias);
    }
  }

  if (species.id === "floetteeternal") {
    aliases.delete("floette");
  }

  return Array.from(aliases).sort();
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
  const defaultBaseSpeciesId = championsDex.species.get(species.baseSpecies).id;
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
    isMega: isMegaSpecies(species),
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

function buildPokemonEntry(
  species: SpeciesSource,
  megaCountByBaseSpecies: Map<string, number>,
): PokemonEntry {
  return {
    id: species.id,
    name: species.name,
    aliases: buildSpeciesAliases(species, megaCountByBaseSpecies),
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
        ? compactAlias(species.baseSpecies)
        : undefined,
  };
}

function buildMoveEntry(move: {
  id: string;
  name: string;
  type: string;
  category: string;
  basePower: number;
  accuracy: number | boolean;
  target: string;
}): MoveEntry {
  return {
    id: move.id,
    name: move.name,
    aliases: aliasVariants(move.name),
    type: move.type,
    category: move.category,
    basePower: move.basePower,
    accuracy: typeof move.accuracy === "number" ? move.accuracy : null,
    target: move.target,
    isSpread: ["allAdjacent", "allAdjacentFoes"].includes(move.target),
  };
}

async function resolveLearnsetMoveIds(species: PokemonEntry) {
  const moveIds = new Set<string>();
  const visited = new Set<string>();
  let currentId: string | undefined = species.id;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const learnset = await championsDex.learnsets.get(currentId);

    for (const moveId of Object.keys(learnset?.learnset ?? {})) {
      moveIds.add(moveId);
    }

    const currentSpecies = championsDex.species.get(currentId);
    currentId =
      SPECIAL_BASE_SPECIES_IDS.get(currentSpecies.id) ??
      species.defaultFormOf ??
      (currentSpecies.baseSpecies
        ? championsDex.species.get(currentSpecies.baseSpecies).id
        : undefined);
  }

  return Array.from(moveIds).sort();
}

async function buildLearnsetEntries(pokemonEntries: PokemonEntry[]) {
  const learnsetEntries: LearnsetEntry[] = [];

  for (const species of pokemonEntries) {
    learnsetEntries.push({
      pokemonId: species.id,
      moveIds: await resolveLearnsetMoveIds(species),
    });
  }

  return learnsetEntries.sort((a, b) => a.pokemonId.localeCompare(b.pokemonId));
}

function buildRosterHash(pokemonIds: Iterable<string>) {
  const normalizedRoster = Array.from(new Set(pokemonIds)).sort();

  return `sha256:${createHash("sha256")
    .update(JSON.stringify(normalizedRoster))
    .digest("hex")}`;
}

export async function buildStaticDataSnapshot() {
  const legalSpecies = championsDex.species
    .all()
    .filter(isLegalChampionsSpecies);
  const allowedPokemonIds = Array.from(
    new Set([
      ...legalSpecies.map((species) => species.id),
      ...LOCAL_REGULATION_SPECIES_FIXES,
    ]),
  );
  const speciesSourceById: Map<string, SpeciesSource> = new Map(
    allowedPokemonIds
      .map((pokemonId) => championsDex.species.get(pokemonId))
      .filter((species) => species.exists)
      .map((species) => [species.id, toSpeciesSource(species)]),
  );

  for (const species of legalSpecies) {
    const dependencies = [
      SPECIAL_BASE_SPECIES_IDS.get(species.id),
      species.baseSpecies
        ? championsDex.species.get(species.baseSpecies).id
        : null,
    ];

    for (const dependencyId of dependencies) {
      if (!dependencyId || speciesSourceById.has(dependencyId)) {
        continue;
      }

      const dependency = championsDex.species.get(dependencyId);

      if (
        dependency.exists &&
        !["CAP", "Unreleased"].includes(dependency.tier)
      ) {
        speciesSourceById.set(dependency.id, toSpeciesSource(dependency));
      }
    }
  }

  const speciesSources = Array.from(speciesSourceById.values());
  const megaCountByBaseSpecies = new Map<string, number>();

  for (const species of speciesSources) {
    if (!species.isMega) {
      continue;
    }

    megaCountByBaseSpecies.set(
      species.baseSpecies,
      (megaCountByBaseSpecies.get(species.baseSpecies) ?? 0) + 1,
    );
  }

  const pokemonEntries = speciesSources
    .map((species) => buildPokemonEntry(species, megaCountByBaseSpecies))
    .sort((a, b) => a.name.localeCompare(b.name));
  const moveEntries = championsDex.moves
    .all()
    .filter(isLegalChampionsMove)
    .map(buildMoveEntry)
    .sort((a, b) => a.name.localeCompare(b.name));
  const itemEntries = championsDex.items
    .all()
    .filter(isLegalChampionsItem)
    .map((item) => ({ id: item.id, name: item.name }) satisfies ItemEntry)
    .sort((left, right) => left.name.localeCompare(right.name));
  const learnsetEntries = await buildLearnsetEntries(pokemonEntries);
  const regulationEntry: RegulationEntry = {
    id: "regulation-m-a",
    name: "Regulation M-A",
    seasons: ["Season M-1"],
    dateRange: "April 8th 2026 - June 17th 2026",
    allowedPokemonIds,
  };

  return {
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    itemEntries,
    regulationEntry,
    activeRegulationConfig: {
      regulationId: regulationEntry.id,
      rosterHash: buildRosterHash(allowedPokemonIds),
      formatId: CHAMPIONS_FORMAT_ID,
    },
  };
}
