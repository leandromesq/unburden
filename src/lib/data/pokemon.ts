import pokemon from "@/data/pokemon.gen9.json";
import { activeRegulation } from "@/lib/data/regulations";
import { normalizeId } from "@/lib/data/normalization";
import type { PokemonEntry } from "@/lib/types";

const pokemonData = pokemon as PokemonEntry[];
const legalIds = new Set(activeRegulation.allowedPokemonIds);

export const legalPokemonData: PokemonEntry[] = pokemonData.filter((entry) =>
  legalIds.has(entry.id),
);

export const pokemonById = new Map(
  pokemonData.map((entry) => [entry.id, entry]),
);

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

function slugifySpriteCandidate(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCanonicalPromptPokemonName(pokemon: PokemonEntry) {
  return slugifySpriteCandidate(pokemon.name);
}
