import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ActiveRegulationConfig } from "../src/lib/types";
import {
  extractMarkdownSection,
  fetchPikalyticsFormatIndex,
  fetchPikalyticsHomePage,
  parseCurrentFormatCode,
  parseFormatDataDate,
  parseIndexEntries,
  parseUsageEntries,
  resolvePikalyticsAiMarkdown,
} from "./fetch/fetch-pikalytics";
import {
  buildMoveIndex,
  buildPikalyticsSpeciesNameCandidates,
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

const REQUEST_CONCURRENCY = 6;

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
  const regulationsDir = path.join(dataDir, "regulations");
  const activeRegulationPath = path.join(regulationsDir, "active.json");

  const overrides =
    (await maybeReadJson<VgcMetaOverrides>(overridesPath)) ??
    ({
      speciesIdOverrides: {},
      profileOverrides: {},
    } satisfies VgcMetaOverrides);

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
  const activeRegulationConfig =
    await readJson<ActiveRegulationConfig>(activeRegulationPath);
  const regulationPath = path.join(
    regulationsDir,
    `${activeRegulationConfig.regulationId}.json`,
  );
  const activeRegulation = await readJson<RegulationEntry>(regulationPath);

  const [pokemonData, moveData, formAliasData, legalItemData, previousMeta] =
    await Promise.all([
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

  const pikalyticsHomePage = await fetchPikalyticsHomePage();
  const resolvedFormat = parseCurrentFormatCode(pikalyticsHomePage);

  if (!resolvedFormat) {
    throw new Error("Unable to determine current Pikalytics format code.");
  }

  const indexMarkdown = await fetchPikalyticsFormatIndex(resolvedFormat);
  const dataDate = parseFormatDataDate(indexMarkdown);
  const indexEntries = parseIndexEntries(indexMarkdown);

  if (!indexEntries.length) {
    throw new Error(`No Pokemon entries were found for ${resolvedFormat}.`);
  }

  const skippedSpecies: string[] = [];
  const fetchFailures: string[] = [];
  const speciesNameByPokemonId = buildSpeciesNameByPokemonId(
    indexEntries,
    pokemonIdIndex,
  );

  const profileResults = await mapWithConcurrency(
    legalPokemon,
    REQUEST_CONCURRENCY,
    async (pokemon) => {
      const sourcePokemon =
        pokemonById.get(pokemon.defaultFormOf ?? "") ??
        pokemonById.get(pokemon.baseSpeciesId ?? "") ??
        pokemon;
      const previousProfile = previousMetaByPokemonId.get(pokemon.id);
      const directIndexSpeciesName = speciesNameByPokemonId.get(pokemon.id);
      const sourceIndexSpeciesName = speciesNameByPokemonId.get(
        sourcePokemon.id,
      );
      const candidateSpeciesNames = dedupeStrings([
        directIndexSpeciesName,
        sourceIndexSpeciesName,
        ...buildPikalyticsSpeciesNameCandidates(pokemon, pokemonById),
        ...buildPikalyticsSpeciesNameCandidates(sourcePokemon, pokemonById),
      ]);
      const indexEntry =
        indexEntries.find(
          (entry) => entry.speciesName === directIndexSpeciesName,
        ) ??
        indexEntries.find(
          (entry) => entry.speciesName === sourceIndexSpeciesName,
        ) ??
        null;

      try {
        const resolvedMarkdown = await resolvePikalyticsAiMarkdown(
          resolvedFormat,
          candidateSpeciesNames,
        );

        if (!resolvedMarkdown.markdown) {
          if (previousProfile) {
            const mergedPreviousProfile = mergeProfile(
              {
                ...previousProfile,
                pokemonId: pokemon.id,
              },
              overrides.profileOverrides?.[pokemon.id],
            );

            return {
              usagePercent: indexEntry?.usagePercent ?? 0,
              profile: {
                ...mergedPreviousProfile,
                commonMoves: dedupeStrings(
                  mergedPreviousProfile.commonMoves ?? [],
                ).slice(0, commonMoveLimit),
                commonAbilities: dedupeStrings(
                  mergedPreviousProfile.commonAbilities ?? [],
                ).slice(0, commonAbilityLimit),
                commonItems: dedupeStrings(
                  mergedPreviousProfile.commonItems ?? [],
                ).slice(0, commonItemLimit),
              },
            };
          }

          fetchFailures.push(
            `${pokemon.name}: ${
              resolvedMarkdown.error ??
              `No Pikalytics AI page resolved from candidates ${candidateSpeciesNames.join(", ")}`
            }`,
          );
          return null;
        }

        const commonMovesSection = parseUsageEntries(
          extractMarkdownSection(resolvedMarkdown.markdown, "Common Moves"),
        );
        const commonAbilitiesSection = parseUsageEntries(
          extractMarkdownSection(resolvedMarkdown.markdown, "Common Abilities"),
        );
        const commonItemsSection = parseUsageEntries(
          extractMarkdownSection(resolvedMarkdown.markdown, "Common Items"),
        );
        const { defaultItem, commonItems } =
          pokemon.isMega && pokemon.requiredItem
            ? {
                defaultItem: pokemon.requiredItem,
                commonItems: [pokemon.requiredItem],
              }
            : resolveDefaultItem(
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
          skippedSpecies.push(
            `${pokemon.name}${resolvedMarkdown.speciesName ? ` <- ${resolvedMarkdown.speciesName}` : ""}`,
          );
          return null;
        }

        const mergedProfile = mergeProfile(
          {
            pokemonId: pokemon.id,
            defaultItem,
            defaultAbility,
            defaultMove,
            commonMoves,
            commonAbilities,
            commonItems,
          },
          overrides.profileOverrides?.[pokemon.id],
        );

        return {
          usagePercent: indexEntry?.usagePercent ?? 0,
          profile: {
            ...mergedProfile,
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
      } catch (error) {
        fetchFailures.push(
          `${pokemon.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    },
  );

  const baseProfiles = profileResults
    .filter((entry): entry is NonNullable<(typeof profileResults)[number]> =>
      Boolean(entry),
    )
    .sort((left, right) => {
      if (right.usagePercent !== left.usagePercent) {
        return right.usagePercent - left.usagePercent;
      }

      return left.profile.pokemonId.localeCompare(right.profile.pokemonId);
    });
  const nextMeta = finalizeMetaProfiles(baseProfiles);

  validateMetaProfiles(nextMeta, pokemonById, legalItemById, moveIndex);
  warnOnLargeProfileDelta(previousMeta?.length ?? null, nextMeta.length);

  await mkdir(dataDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextMeta, null, 2)}\n`, "utf8");

  console.log(
    [
      `Generated ${nextMeta.length} Champions meta profiles from Pikalytics format ${resolvedFormat}.`,
      `Active regulation: ${activeRegulation.id}.`,
      dataDate ? `Data date: ${dataDate}.` : "Data date: unavailable.",
      `Legal Pokemon crawled: ${legalPokemon.length}.`,
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
