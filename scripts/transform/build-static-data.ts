import { Generations } from "@pkmn/data";
import { Dex } from "@pkmn/dex";

import regulationVerification from "../../src/lib/data/regulation-verification";

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

type StaticDataBuildOptions = {
  championSpeciesNames: string[];
  championsMegaAbilities: Map<string, string>;
  itemEntries: ItemEntry[];
  liveRosterNames: string[];
  regulationAllowedPokemonIds: string[];
};

const EXTRA_SPECIES_NAMES = ["Floette-Eternal"];
const SPECIAL_BASE_SPECIES_IDS = new Map<string, string>([
  ["floettemega", "floetteeternal"],
]);
const MEGA_SPECIES_ID_PATTERN = /mega(x|y)?$/i;
const { compareRegulationRosters, resolveRegulationRosterIds } =
  regulationVerification;

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

function buildSpeciesIdIndex(speciesPool: Iterable<SpeciesSource>) {
  const speciesEntries = Array.from(speciesPool);
  const index = new Map<string, string>();
  const megaCountByBaseSpecies = new Map<string, number>();

  for (const species of speciesEntries) {
    if (!species.isMega) {
      continue;
    }

    megaCountByBaseSpecies.set(
      species.baseSpecies,
      (megaCountByBaseSpecies.get(species.baseSpecies) ?? 0) + 1,
    );
  }

  for (const species of speciesEntries) {
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

export async function buildStaticDataSnapshot({
  championSpeciesNames,
  championsMegaAbilities,
  itemEntries,
  liveRosterNames,
  regulationAllowedPokemonIds,
}: StaticDataBuildOptions) {
  const gens = new Generations(Dex);
  const gen = gens.get(9);
  const pokemonEntries: PokemonEntry[] = [];
  const speciesPool = new Map<string, SpeciesSource>();

  for (const species of gen.species) {
    speciesPool.set(species.id, toSpeciesSource(species));
  }

  for (const species of Dex.species.all()) {
    if (!species.exists || !isMegaSpecies(species)) {
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

  for (const pokemonId of regulationAllowedPokemonIds) {
    const species = Dex.species.get(pokemonId);

    if (!species.exists) {
      continue;
    }

    speciesPool.set(species.id, toSpeciesSource(species));
  }

  const speciesIdIndex = buildSpeciesIdIndex(speciesPool.values());
  const { liveRosterIds, unresolvedSpeciesNames } = resolveRegulationRosterIds(
    liveRosterNames,
    speciesIdIndex,
  );
  const { missingFromLocal, extraInLocal } = compareRegulationRosters(
    liveRosterIds,
    regulationAllowedPokemonIds,
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

  return {
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    itemEntries,
    missingFromLocal,
    extraInLocal,
    unresolvedSpeciesNames,
  };
}
