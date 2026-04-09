import formAliases from "@/data/form-aliases.json";
import learnsets from "@/data/learnsets.gen9.json";
import moves from "@/data/moves.gen9.json";
import pokemon from "@/data/pokemon.gen9.json";
import vgcMeta from "@/data/vgc-meta.json";
import type {
  FormAliasEntry,
  LearnsetEntry,
  MoveEntry,
  PokemonEntry,
  VgcMetaProfile,
} from "@/lib/types";

export const pokemonData = pokemon as PokemonEntry[];
export const moveData = moves as MoveEntry[];
export const learnsetData = learnsets as LearnsetEntry[];
export const vgcMetaProfiles = vgcMeta as VgcMetaProfile[];
export const formAliasData = formAliases as FormAliasEntry[];

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

export const pokemonById = new Map(pokemonData.map((entry) => [entry.id, entry]));
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
export const allowedItemIds = new Set(
  vgcMetaProfiles.map((entry) => normalizeId(entry.defaultItem)),
);
export const itemDisplayById = new Map(
  vgcMetaProfiles.map((entry) => [normalizeId(entry.defaultItem), entry.defaultItem]),
);
