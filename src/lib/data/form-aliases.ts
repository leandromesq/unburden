import formAliases from "@/data/form-aliases.json";
import { normalizeAlias } from "@/lib/data/normalization";
import { legalPokemonData } from "@/lib/data/pokemon";
import type { FormAliasEntry } from "@/lib/types";

const formAliasData = formAliases as FormAliasEntry[];
const legalIds = new Set(legalPokemonData.map((entry) => entry.id));

export const formAliasMap = new Map(
  formAliasData
    .filter((entry) => legalIds.has(entry.pokemonId))
    .map((entry) => [normalizeAlias(entry.alias), entry.pokemonId]),
);
