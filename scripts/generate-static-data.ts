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

async function main() {
  const gens = new Generations(Dex);
  const gen = gens.get(9);
  const dataDir = path.join(process.cwd(), "src", "data");

  await mkdir(dataDir, { recursive: true });

  const pokemonEntries: PokemonEntry[] = [];

  for (const species of gen.species) {
    const aliases = new Set<string>();

    for (const alias of aliasVariants(species.name)) {
      aliases.add(alias);
    }

    pokemonEntries.push({
      id: species.id,
      name: species.name,
      aliases: Array.from(aliases).sort(),
      types: [...species.types],
      abilities: Object.values(species.abilities).filter(Boolean),
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
    const speciesEntry = gen.species.get(species.name);

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
