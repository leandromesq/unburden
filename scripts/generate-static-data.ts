import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildStaticDataSnapshot,
  type ItemEntry,
  type LearnsetEntry,
  type MoveEntry,
  type PokemonEntry,
  type RegulationEntry,
} from "./transform/build-static-data";
import { formatJsonWithCompactArrays } from "./transform/format-json";

const MIN_POKEMON_ENTRY_COUNT = 250;
const MIN_MOVE_ENTRY_COUNT = 400;
const MIN_LEARNSET_ENTRY_COUNT = 250;
const MIN_ITEM_ENTRY_COUNT = 100;
const MAX_ENTRY_COUNT_DELTA = 150;

type ActiveRegulationConfig = {
  regulationId: string;
  rosterHash?: string;
  formatId?: string;
};

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

    const hasInvalidStat = Object.values(entry.baseStats).some(
      (value) => !Number.isInteger(value) || value <= 0,
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
) {
  if (entries.length < MIN_LEARNSET_ENTRY_COUNT) {
    throw new Error(
      `Generated only ${entries.length} learnset entries; expected at least ${MIN_LEARNSET_ENTRY_COUNT}.`,
    );
  }

  const pokemonIds = new Set(pokemonEntries.map((entry) => entry.id));
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
      if (!moveId.trim()) {
        throw new Error(
          `Learnset entry ${entry.pokemonId} contains an empty move id.`,
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

function validateRegulationEntry(
  entry: RegulationEntry,
  pokemonEntries: PokemonEntry[],
) {
  const pokemonIds = new Set(pokemonEntries.map((pokemon) => pokemon.id));

  if (!entry.allowedPokemonIds.length) {
    throw new Error(`Regulation ${entry.id} has no allowed Pokemon.`);
  }

  for (const pokemonId of entry.allowedPokemonIds) {
    if (!pokemonIds.has(pokemonId)) {
      throw new Error(
        `Regulation ${entry.id} references unknown pokemon id: ${pokemonId}`,
      );
    }
  }
}

function validateGeneratedData({
  pokemonEntries,
  moveEntries,
  learnsetEntries,
  itemEntries,
  regulationEntry,
}: {
  pokemonEntries: PokemonEntry[];
  moveEntries: MoveEntry[];
  learnsetEntries: LearnsetEntry[];
  itemEntries: ItemEntry[];
  regulationEntry: RegulationEntry;
}) {
  validatePokemonEntries(pokemonEntries);
  validateMoveEntries(moveEntries);
  validateLearnsetEntries(learnsetEntries, pokemonEntries);
  validateItemEntries(itemEntries);
  validateRegulationEntry(regulationEntry, pokemonEntries);
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
  const dataDir = path.join(process.cwd(), "src", "data");
  const regulationsDir = path.join(dataDir, "regulations");

  await mkdir(dataDir, { recursive: true });
  await mkdir(regulationsDir, { recursive: true });

  const {
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    itemEntries,
    regulationEntry,
    activeRegulationConfig,
  } = await buildStaticDataSnapshot();

  validateGeneratedData({
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    itemEntries,
    regulationEntry,
  });

  const [
    previousPokemonEntries,
    previousMoveEntries,
    previousLearnsetEntries,
    previousItemEntries,
    previousRegulationEntry,
  ] = await Promise.all([
    readExistingJson<PokemonEntry[]>(path.join(dataDir, "pokemon.gen9.json")),
    readExistingJson<MoveEntry[]>(path.join(dataDir, "moves.gen9.json")),
    readExistingJson<LearnsetEntry[]>(
      path.join(dataDir, "learnsets.gen9.json"),
    ),
    readExistingJson<ItemEntry[]>(path.join(dataDir, "champions-items.json")),
    readExistingJson<RegulationEntry>(
      path.join(regulationsDir, `${regulationEntry.id}.json`),
    ),
  ]);

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
  warnOnLargeCountDelta(
    "regulation allowed Pokemon",
    previousRegulationEntry?.allowedPokemonIds.length ?? null,
    regulationEntry.allowedPokemonIds.length,
  );

  const compactArrayKeysByFile = new Map<string, ReadonlySet<string>>([
    ["moves.gen9.json", new Set(["aliases"])],
    ["regulations/regulation-m-a.json", new Set(["seasons"])],
  ]);

  const writeJson = async (filename: string, data: unknown) => {
    const target = path.join(dataDir, filename);
    await writeFile(
      target,
      `${formatJsonWithCompactArrays(data, {
        compactArrayKeys: compactArrayKeysByFile.get(filename),
      })}\n`,
      "utf8",
    );
  };

  await writeJson("pokemon.gen9.json", pokemonEntries);
  await writeJson("moves.gen9.json", moveEntries);
  await writeJson("learnsets.gen9.json", learnsetEntries);
  await writeJson("champions-items.json", itemEntries);
  await writeJson(`regulations/${regulationEntry.id}.json`, regulationEntry);
  await writeJson("regulations/active.json", {
    ...((await readExistingJson<ActiveRegulationConfig>(
      path.join(regulationsDir, "active.json"),
    )) ?? {}),
    ...activeRegulationConfig,
  });
}

void main();
