import { Sprites } from "@pkmn/img";

import type { PokemonEntry } from "@/lib/types";

export function getPokemonSpriteSources(pokemon: PokemonEntry) {
  return Array.from(
    new Set(
      [
        Sprites.getPokemon(pokemon.name, { gen: 9 }).url,
        Sprites.getPokemon(pokemon.name, { gen: 5 }).url,
      ].filter(Boolean),
    ),
  );
}
