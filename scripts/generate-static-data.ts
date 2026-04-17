import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ActiveRegulationConfig } from "../src/lib/types";
import regulationVerification from "../src/lib/data/regulation-verification";
import regulationMA from "../src/data/regulations/regulation-m-a.json";
import {
  fetchPikalyticsFormatIndex,
  parseIndexSpeciesNames,
} from "./fetch/fetch-pikalytics";
import {
  fetchChampionsItems,
  fetchChampionsMegaAbilities,
  fetchRegulationMARosterNames,
} from "./fetch/fetch-serebii";
import {
  buildStaticDataSnapshot,
  type ItemEntry,
  type LearnsetEntry,
  type MoveEntry,
  type PokemonEntry,
} from "./transform/build-static-data";

const DEFAULT_CHAMPIONS_FORMAT = "championspreview";
const MIN_POKEMON_ENTRY_COUNT = 400;
const MIN_MOVE_ENTRY_COUNT = 200;
const MIN_LEARNSET_ENTRY_COUNT = 350;
const MIN_ITEM_ENTRY_COUNT = 50;
const MAX_ENTRY_COUNT_DELTA = 75;
const { buildRosterHash, formatVerificationDate } = regulationVerification;

async function readExistingJson<T>(filepath: string): Promise<T | null> {
  try {
    const content = await readFile(filepath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function assertUniqueIds<T extends { id: string }>(entries: T[], label: string) {
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
  const dataDir = path.join(process.cwd(), "src", "data");
  const regulationsDir = path.join(dataDir, "regulations");
  const activeRegulationPath = path.join(regulationsDir, "active.json");

  const [
    championsIndexMarkdown,
    championsMegaAbilities,
    itemEntries,
    liveRosterNames,
  ] = await Promise.all([
    fetchPikalyticsFormatIndex(DEFAULT_CHAMPIONS_FORMAT),
    fetchChampionsMegaAbilities(),
    fetchChampionsItems(),
    fetchRegulationMARosterNames(),
  ]);
  const championSpeciesNames = parseIndexSpeciesNames(championsIndexMarkdown);

  await mkdir(dataDir, { recursive: true });

  const {
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    itemEntries: builtItemEntries,
    missingFromLocal,
    extraInLocal,
    unresolvedSpeciesNames,
  } = await buildStaticDataSnapshot({
    championSpeciesNames,
    championsMegaAbilities,
    itemEntries,
    liveRosterNames,
    regulationAllowedPokemonIds: regulationMA.allowedPokemonIds,
  });

  if (unresolvedSpeciesNames.length > 0) {
    throw new Error(
      `Failed to resolve live Serebii roster entries: ${unresolvedSpeciesNames.join(", ")}`,
    );
  }

  validateGeneratedData(
    pokemonEntries,
    moveEntries,
    learnsetEntries,
    builtItemEntries,
  );

  const [previousPokemonEntries, previousMoveEntries, previousLearnsetEntries, previousItemEntries, previousActiveRegulationConfig] =
    await Promise.all([
      readExistingJson<PokemonEntry[]>(path.join(dataDir, "pokemon.gen9.json")),
      readExistingJson<MoveEntry[]>(path.join(dataDir, "moves.gen9.json")),
      readExistingJson<LearnsetEntry[]>(path.join(dataDir, "learnsets.gen9.json")),
      readExistingJson<ItemEntry[]>(path.join(dataDir, "champions-items.json")),
      readExistingJson<ActiveRegulationConfig>(activeRegulationPath),
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
    builtItemEntries.length,
  );

  const rosterHash = await buildRosterHash(regulationMA.allowedPokemonIds);
  const isRosterVerified =
    missingFromLocal.length === 0 && extraInLocal.length === 0;

  if (!isRosterVerified) {
    console.warn("regulation-m-a.json may be out of date:");

    if (missingFromLocal.length > 0) {
      console.warn(`  + missing from local: ${missingFromLocal.join(", ")}`);
    }

    if (extraInLocal.length > 0) {
      console.warn(`  - extra in local: ${extraInLocal.join(", ")}`);
    }

    console.warn(
      "  active regulation verification date was left unchanged because the live roster does not match local data.",
    );
  }

  const nextActiveRegulationConfig: ActiveRegulationConfig = {
    regulationId: regulationMA.id,
    rosterHash,
  };

  if (isRosterVerified) {
    nextActiveRegulationConfig.lastVerified = formatVerificationDate();
  } else if (previousActiveRegulationConfig?.lastVerified) {
    nextActiveRegulationConfig.lastVerified =
      previousActiveRegulationConfig.lastVerified;
  }

  const writeJson = async (filename: string, data: unknown) => {
    const target = path.join(dataDir, filename);
    await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  };

  await writeJson("pokemon.gen9.json", pokemonEntries);
  await writeJson("moves.gen9.json", moveEntries);
  await writeJson("learnsets.gen9.json", learnsetEntries);
  await writeJson("champions-items.json", builtItemEntries);
  await writeFile(
    activeRegulationPath,
    `${JSON.stringify(nextActiveRegulationConfig, null, 2)}\n`,
    "utf8",
  );
}

void main();
