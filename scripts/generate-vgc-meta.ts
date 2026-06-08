import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ActiveRegulationConfig } from "../src/lib/types";
import {
  DEFAULT_SMOGON_STATS_CUTOFF,
  DEFAULT_SMOGON_STATS_FORMAT,
  fetchSmogonMetaRecords,
  resolveSmogonStatsFormatId,
  type SmogonMetaRecord,
} from "./fetch/fetch-smogon-stats";
import {
  buildMetaSpeciesNameCandidates,
  buildMoveIndex,
  buildPokemonIdIndex,
  buildSpeciesNameByPokemonId,
  DEFAULT_COMMON_ABILITY_LIMIT,
  DEFAULT_COMMON_ITEM_LIMIT,
  DEFAULT_COMMON_MOVE_LIMIT,
  dedupeStrings,
  finalizeMetaProfiles,
  mergeProfile,
  resolveDefaultAbility,
  resolveDefaultItem,
  resolveMoveProfile,
  validateMetaProfiles,
  warnOnLargeProfileDelta,
  type FormAliasEntry,
  type ItemEntry,
  type MoveEntry,
  type PokemonEntry,
  type RegulationEntry,
  type VgcMetaOverrides,
  type VgcMetaProfile,
} from "./transform/build-vgc-meta";
import { formatJsonWithCompactArrays } from "./transform/format-json";

const FALLBACK_ITEM_ID = "sitrusberry";
const LATEST_MONTH = "latest";

type LearnsetEntry = {
  pokemonId: string;
  moveIds: string[];
};

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

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getFallbackMovePower(move: MoveEntry) {
  if (move.id === "populationbomb") {
    return 100;
  }

  if (move.id === "tripleaxel") {
    return 120;
  }

  if (["rockblast", "bulletseed", "scaleshot"].includes(move.id)) {
    return 75;
  }

  return move.basePower;
}

function buildFallbackMoveProfile(
  pokemon: PokemonEntry,
  learnset: LearnsetEntry | undefined,
  moveById: Map<string, MoveEntry>,
  commonMoveLimit: number,
) {
  const damagingMoves = (learnset?.moveIds ?? [])
    .map((moveId) => moveById.get(moveId) ?? null)
    .filter((move): move is MoveEntry => {
      if (!move) {
        return false;
      }

      return move.category !== "Status" && getFallbackMovePower(move) > 0;
    })
    .sort((left, right) => {
      const leftStab = pokemon.types.includes(left.type) ? 1 : 0;
      const rightStab = pokemon.types.includes(right.type) ? 1 : 0;
      const stabDelta = rightStab - leftStab;

      if (stabDelta !== 0) {
        return stabDelta;
      }

      return getFallbackMovePower(right) - getFallbackMovePower(left);
    });

  const defaultMove = damagingMoves[0]?.name ?? "Tackle";

  return {
    defaultMove,
    commonMoves: dedupeStrings([
      defaultMove,
      ...damagingMoves.map((move) => move.name),
    ]).slice(0, commonMoveLimit),
  };
}

function buildFallbackMetaProfile({
  pokemon,
  previousProfile,
  override,
  learnset,
  moveById,
  legalItemById,
  commonMoveLimit,
  commonAbilityLimit,
  commonItemLimit,
}: {
  pokemon: PokemonEntry;
  previousProfile: VgcMetaProfile | undefined;
  override: Partial<VgcMetaProfile> | undefined;
  learnset: LearnsetEntry | undefined;
  moveById: Map<string, MoveEntry>;
  legalItemById: Map<string, string>;
  commonMoveLimit: number;
  commonAbilityLimit: number;
  commonItemLimit: number;
}) {
  const fallbackItem =
    (pokemon.isMega && pokemon.requiredItem
      ? pokemon.requiredItem
      : legalItemById.get(FALLBACK_ITEM_ID)) ??
    legalItemById.values().next().value ??
    "Sitrus Berry";
  const moveProfile = buildFallbackMoveProfile(
    pokemon,
    learnset,
    moveById,
    commonMoveLimit,
  );
  const knownMoveNames = new Set(
    Array.from(moveById.values()).map((move) => normalizeId(move.name)),
  );
  const previousDefaultMove = knownMoveNames.has(
    normalizeId(previousProfile?.defaultMove ?? ""),
  )
    ? previousProfile?.defaultMove
    : null;
  const previousCommonMoves = (previousProfile?.commonMoves ?? []).filter(
    (moveName) => knownMoveNames.has(normalizeId(moveName)),
  );
  const baseProfile: VgcMetaProfile = {
    pokemonId: pokemon.id,
    usageRank: previousProfile?.usageRank ?? Number.MAX_SAFE_INTEGER,
    usagePercent: previousProfile?.usagePercent,
    defaultItem: previousProfile?.defaultItem ?? fallbackItem,
    defaultAbility:
      previousProfile?.defaultAbility ?? pokemon.abilities[0] ?? "No Ability",
    defaultMove: previousDefaultMove ?? moveProfile.defaultMove,
    commonMoves: dedupeStrings([
      ...previousCommonMoves,
      ...moveProfile.commonMoves,
    ]).slice(0, commonMoveLimit),
    commonAbilities: dedupeStrings([
      ...(previousProfile?.commonAbilities ?? []),
      ...pokemon.abilities,
    ]).slice(0, commonAbilityLimit),
    commonItems: dedupeStrings([
      ...(previousProfile?.commonItems ?? []),
      fallbackItem,
    ]).slice(0, commonItemLimit),
  };

  return mergeProfile(baseProfile, override);
}

function buildRecordIndexes(
  records: SmogonMetaRecord[],
  pokemonIdIndex: Map<string, string>,
) {
  const speciesNameByPokemonId = buildSpeciesNameByPokemonId(
    records,
    pokemonIdIndex,
  );
  const recordBySpeciesName = new Map(
    records.map((record) => [record.speciesName, record]),
  );
  const recordByPokemonId = new Map<string, SmogonMetaRecord>();

  for (const [pokemonId, speciesName] of speciesNameByPokemonId) {
    const record = recordBySpeciesName.get(speciesName);

    if (!record || recordByPokemonId.has(pokemonId)) {
      continue;
    }

    recordByPokemonId.set(pokemonId, record);
  }

  return {
    speciesNameByPokemonId,
    recordBySpeciesName,
    recordByPokemonId,
  };
}

function resolveMetaRecord({
  pokemon,
  sourcePokemon,
  speciesNameByPokemonId,
  recordBySpeciesName,
  recordByPokemonId,
  pokemonById,
}: {
  pokemon: PokemonEntry;
  sourcePokemon: PokemonEntry;
  speciesNameByPokemonId: Map<string, string>;
  recordBySpeciesName: Map<string, SmogonMetaRecord>;
  recordByPokemonId: Map<string, SmogonMetaRecord>;
  pokemonById: Map<string, PokemonEntry>;
}) {
  const directRecord = recordByPokemonId.get(pokemon.id);
  const sourceRecord = recordByPokemonId.get(sourcePokemon.id);

  if (directRecord ?? sourceRecord) {
    return directRecord ?? sourceRecord ?? null;
  }

  const candidateSpeciesNames = dedupeStrings([
    speciesNameByPokemonId.get(pokemon.id),
    speciesNameByPokemonId.get(sourcePokemon.id),
    ...buildMetaSpeciesNameCandidates(pokemon, pokemonById),
    ...buildMetaSpeciesNameCandidates(sourcePokemon, pokemonById),
  ]);

  return (
    candidateSpeciesNames
      .map((speciesName) => recordBySpeciesName.get(speciesName) ?? null)
      .find((record): record is SmogonMetaRecord => Boolean(record)) ?? null
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, "src", "data");
  const outputPath = path.join(dataDir, "vgc-meta.json");
  const overridesPath = path.join(dataDir, "vgc-meta.overrides.json");
  const regulationsDir = path.join(dataDir, "regulations");
  const activeRegulationPath = path.join(regulationsDir, "active.json");

  const overrides =
    (await maybeReadJson<VgcMetaOverrides>(overridesPath)) ??
    ({
      speciesIdOverrides: {},
      profileOverrides: {},
    } satisfies VgcMetaOverrides);

  if (overrides.source && overrides.source !== "smogon") {
    throw new Error(`Unsupported VGC meta source: ${overrides.source}.`);
  }

  const commonMoveLimit = Number(
    args.get("--top-moves") ??
      overrides.commonMoveLimit ??
      DEFAULT_COMMON_MOVE_LIMIT,
  );
  const commonAbilityLimit = Number(
    args.get("--top-abilities") ??
      overrides.commonAbilityLimit ??
      DEFAULT_COMMON_ABILITY_LIMIT,
  );
  const commonItemLimit = Number(
    args.get("--top-items") ??
      overrides.commonItemLimit ??
      DEFAULT_COMMON_ITEM_LIMIT,
  );
  const requestedFormat =
    args.get("--format") ?? overrides.format ?? DEFAULT_SMOGON_STATS_FORMAT;
  const requestedMonth = args.get("--month") ?? overrides.month ?? LATEST_MONTH;
  const requestedCutoff = Number(
    args.get("--cutoff") ?? overrides.cutoff ?? DEFAULT_SMOGON_STATS_CUTOFF,
  );
  const activeRegulationConfig =
    await readJson<ActiveRegulationConfig>(activeRegulationPath);
  const regulationPath = path.join(
    regulationsDir,
    `${activeRegulationConfig.regulationId}.json`,
  );
  const activeRegulation = await readJson<RegulationEntry>(regulationPath);

  const [
    pokemonData,
    moveData,
    learnsetData,
    formAliasData,
    legalItemData,
    previousMeta,
    smogonResult,
  ] = await Promise.all([
    readJson<PokemonEntry[]>(path.join(dataDir, "pokemon.gen9.json")),
    readJson<MoveEntry[]>(path.join(dataDir, "moves.gen9.json")),
    readJson<LearnsetEntry[]>(path.join(dataDir, "learnsets.gen9.json")),
    readJson<FormAliasEntry[]>(path.join(dataDir, "form-aliases.json")),
    readJson<ItemEntry[]>(path.join(dataDir, "champions-items.json")),
    maybeReadJson<VgcMetaProfile[]>(outputPath),
    fetchSmogonMetaRecords({
      format: requestedFormat,
      month: requestedMonth,
      cutoff: requestedCutoff,
    }),
  ]);

  const previousMetaByPokemonId = new Map(
    (previousMeta ?? []).map((profile) => [profile.pokemonId, profile]),
  );
  const pokemonById = new Map(pokemonData.map((entry) => [entry.id, entry]));
  const moveById = new Map(moveData.map((entry) => [entry.id, entry]));
  const learnsetByPokemonId = new Map(
    learnsetData.map((entry) => [entry.pokemonId, entry]),
  );
  const legalItemById = new Map(
    legalItemData.map((entry) => [entry.id, entry.name]),
  );
  const pokemonIdIndex = buildPokemonIdIndex(
    pokemonData,
    formAliasData,
    overrides.speciesIdOverrides ?? {},
  );
  const moveIndex = buildMoveIndex(moveData);
  const unresolvedSpecies: string[] = [];
  const legalPokemonIds = dedupeStrings(activeRegulation.allowedPokemonIds);
  const legalPokemon = legalPokemonIds
    .map((pokemonId) => pokemonById.get(pokemonId) ?? null)
    .filter((entry): entry is PokemonEntry => Boolean(entry));
  const missingLegalPokemonIds = legalPokemonIds.filter(
    (pokemonId) => !pokemonById.has(pokemonId),
  );

  if (missingLegalPokemonIds.length) {
    unresolvedSpecies.push(
      ...missingLegalPokemonIds.map(
        (pokemonId) =>
          `${pokemonId} (missing from pokemon.gen9.json for active regulation ${activeRegulation.id})`,
      ),
    );
  }

  if (!smogonResult.records.length) {
    throw new Error(
      `No Pokemon entries were found for Smogon format ${smogonResult.formatId}.`,
    );
  }

  const fallbackSpecies: string[] = [];
  const skippedSpecies: string[] = [];
  const { speciesNameByPokemonId, recordBySpeciesName, recordByPokemonId } =
    buildRecordIndexes(smogonResult.records, pokemonIdIndex);

  const profileResults = legalPokemon.map((pokemon) => {
    const sourcePokemon =
      pokemonById.get(pokemon.defaultFormOf ?? "") ??
      pokemonById.get(pokemon.baseSpeciesId ?? "") ??
      pokemon;
    const previousProfile = previousMetaByPokemonId.get(pokemon.id);
    const override = overrides.profileOverrides?.[pokemon.id];
    const record = resolveMetaRecord({
      pokemon,
      sourcePokemon,
      speciesNameByPokemonId,
      recordBySpeciesName,
      recordByPokemonId,
      pokemonById,
    });

    if (!record) {
      fallbackSpecies.push(pokemon.name);

      return {
        usagePercent: 0,
        profile: buildFallbackMetaProfile({
          pokemon,
          previousProfile,
          override,
          learnset: learnsetByPokemonId.get(
            normalizeId(pokemon.defaultFormOf ?? pokemon.id),
          ),
          moveById,
          legalItemById,
          commonMoveLimit,
          commonAbilityLimit,
          commonItemLimit,
        }),
      };
    }

    const { defaultItem, commonItems } =
      pokemon.isMega && pokemon.requiredItem
        ? {
            defaultItem: pokemon.requiredItem,
            commonItems: [pokemon.requiredItem],
          }
        : resolveDefaultItem(
            record.items,
            previousProfile,
            commonItemLimit,
            legalItemById,
          );
    const { defaultAbility, commonAbilities } = resolveDefaultAbility(
      record.abilities,
      pokemon,
      previousProfile,
      commonAbilityLimit,
    );
    const { defaultMove, commonMoves } = resolveMoveProfile(
      record.moves,
      moveIndex,
      previousProfile,
      commonMoveLimit,
    );

    if (!defaultItem || !defaultAbility || !defaultMove) {
      skippedSpecies.push(`${pokemon.name} <- ${record.speciesName}`);
      fallbackSpecies.push(pokemon.name);

      return {
        usagePercent: record.usagePercent,
        profile: buildFallbackMetaProfile({
          pokemon,
          previousProfile,
          override,
          learnset: learnsetByPokemonId.get(
            normalizeId(pokemon.defaultFormOf ?? pokemon.id),
          ),
          moveById,
          legalItemById,
          commonMoveLimit,
          commonAbilityLimit,
          commonItemLimit,
        }),
      };
    }

    const mergedProfile = mergeProfile(
      {
        pokemonId: pokemon.id,
        usageRank: Number.MAX_SAFE_INTEGER,
        usagePercent: record.usagePercent,
        defaultItem,
        defaultAbility,
        defaultMove,
        commonMoves,
        commonAbilities,
        commonItems,
      },
      override,
    );

    return {
      usagePercent: record.usagePercent,
      profile: {
        ...mergedProfile,
        usageRank: Number.MAX_SAFE_INTEGER,
        usagePercent: record.usagePercent,
        commonMoves: dedupeStrings(mergedProfile.commonMoves ?? []).slice(
          0,
          commonMoveLimit,
        ),
        commonAbilities: dedupeStrings(
          mergedProfile.commonAbilities ?? [],
        ).slice(0, commonAbilityLimit),
        commonItems: dedupeStrings(mergedProfile.commonItems ?? []).slice(
          0,
          commonItemLimit,
        ),
      },
    };
  });

  const baseProfiles = profileResults
    .sort((left, right) => {
      if (right.usagePercent !== left.usagePercent) {
        return right.usagePercent - left.usagePercent;
      }

      return left.profile.pokemonId.localeCompare(right.profile.pokemonId);
    })
    .map((entry, index) => ({
      usagePercent: entry.usagePercent,
      profile: {
        ...entry.profile,
        usageRank: index + 1,
        usagePercent: entry.usagePercent,
      },
    }));
  const nextMeta = finalizeMetaProfiles(baseProfiles);

  validateMetaProfiles(nextMeta, pokemonById, legalItemById, moveIndex);
  warnOnLargeProfileDelta(previousMeta?.length ?? null, nextMeta.length);

  await mkdir(dataDir, { recursive: true });
  await writeFile(
    outputPath,
    `${formatJsonWithCompactArrays(nextMeta, {
      compactArrayKeys: new Set(["commonAbilities"]),
      compactArrayMaxLengthByKey: new Map([
        ["commonItems", 4],
        ["commonMoves", 4],
      ]),
    })}\n`,
    "utf8",
  );

  console.log(
    [
      `Generated ${nextMeta.length} Champions meta profiles from Smogon stats format ${resolveSmogonStatsFormatId(smogonResult.formatId)}.`,
      `Active regulation: ${activeRegulation.id}.`,
      `Stats month: ${smogonResult.month}.`,
      `Cutoff: ${smogonResult.cutoff}.`,
      `Battles: ${smogonResult.stats.info["number of battles"]}.`,
      `Legal Pokemon processed: ${legalPokemon.length}.`,
      unresolvedSpecies.length
        ? `Unresolved species (${unresolvedSpecies.length}): ${unresolvedSpecies.join(", ")}`
        : "Unresolved species: none.",
      skippedSpecies.length
        ? `Skipped species without complete move/item/ability data (${skippedSpecies.length}): ${skippedSpecies.join(", ")}`
        : "Skipped species without complete move/item/ability data: none.",
      fallbackSpecies.length
        ? `Fallback profiles generated (${fallbackSpecies.length}): ${dedupeStrings(fallbackSpecies).join(", ")}`
        : "Fallback profiles generated: none.",
    ].join("\n"),
  );
}

void main();
