import formAliases from "@/data/form-aliases.json";
import learnsets from "@/data/learnsets.gen9.json";
import moves from "@/data/moves.gen9.json";
import pokemon from "@/data/pokemon.gen9.json";
import vgcMeta from "@/data/vgc-meta.json";
import activeRegulationConfig from "@/data/regulations/active.json";
import regulationMA from "@/data/regulations/regulation-m-a.json";
import type {
  FormAliasEntry,
  LearnsetEntry,
  MoveEntry,
  PokemonEntry,
  RegulationEntry,
  VgcMetaProfile,
} from "@/lib/types";

export const pokemonData = pokemon as PokemonEntry[];
export const moveData = moves as MoveEntry[];

const regulationRegistry: Record<string, RegulationEntry> = {
  "regulation-m-a": regulationMA as RegulationEntry,
};

const activeRegulation: RegulationEntry =
  regulationRegistry[activeRegulationConfig.regulationId] ??
  regulationRegistry["regulation-m-a"];

const legalIds = new Set(activeRegulation.allowedPokemonIds);

export { activeRegulation };

export const legalPokemonData: PokemonEntry[] = pokemonData.filter((entry) =>
  legalIds.has(entry.id),
);
const learnsetData = learnsets as LearnsetEntry[];
const vgcMetaProfiles = vgcMeta as VgcMetaProfile[];
const formAliasData = formAliases as FormAliasEntry[];

export function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const pokemonById = new Map(
  pokemonData.map((entry) => [entry.id, entry]),
);
export const moveById = new Map(moveData.map((entry) => [entry.id, entry]));
export const learnsetByPokemonId = new Map(
  learnsetData.map((entry) => [entry.pokemonId, entry]),
);
export const vgcMetaByPokemonId = new Map(
  vgcMetaProfiles.map((entry) => [entry.pokemonId, entry]),
);
export const formAliasMap = new Map(
  formAliasData.map((entry) => [normalizeAlias(entry.alias), entry.pokemonId]),
);
const metaItemPool = Array.from(
  new Map(
    vgcMetaProfiles
      .flatMap((entry) => [entry.defaultItem, ...(entry.commonItems ?? [])])
      .filter(Boolean)
      .map((itemName) => [normalizeId(itemName), itemName]),
  ).entries(),
);
export const allowedItemIds = new Set(metaItemPool.map(([itemId]) => itemId));
export const itemDisplayById = new Map(metaItemPool);

const megaEvolutionPool = pokemonData
  .filter((entry) => entry.isMega && entry.requiredItem && entry.baseSpeciesId)
  .map(
    (entry) =>
      [
        `${entry.baseSpeciesId}:${normalizeId(entry.requiredItem!)}`,
        entry.id,
      ] as const,
  );

const megaEvolutionByBaseIdAndItem = new Map(megaEvolutionPool);

export function resolveMegaEvolution(
  pokemonId: string,
  itemName: string | undefined,
) {
  const pokemon = pokemonById.get(pokemonId);

  if (!pokemon) {
    return null;
  }

  if (pokemon.isMega) {
    return pokemon;
  }

  if (!itemName) {
    return null;
  }

  const megaId = megaEvolutionByBaseIdAndItem.get(
    `${pokemon.id}:${normalizeId(itemName)}`,
  );

  if (!megaId) {
    return null;
  }

  return pokemonById.get(megaId) ?? null;
}
