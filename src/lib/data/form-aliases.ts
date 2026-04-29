import formAliases from "@/data/form-aliases.json";
import { normalizeAlias } from "@/lib/data/normalization";
import type { FormAliasEntry } from "@/lib/types";

const formAliasData = formAliases as FormAliasEntry[];

export const formAliasMap = new Map(
  formAliasData.map((entry) => [normalizeAlias(entry.alias), entry.pokemonId]),
);
