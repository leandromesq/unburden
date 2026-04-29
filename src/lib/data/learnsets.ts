import learnsets from "@/data/learnsets.gen9.json";
import type { LearnsetEntry } from "@/lib/types";

const learnsetData = learnsets as LearnsetEntry[];

export const learnsetByPokemonId = new Map(
  learnsetData.map((entry) => [entry.pokemonId, entry]),
);
