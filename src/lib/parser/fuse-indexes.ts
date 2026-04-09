import Fuse from "fuse.js";

import {
  formAliasMap,
  moveData,
  pokemonById,
  pokemonData,
  normalizeAlias,
} from "@/lib/data/loaders";
import type { MoveEntry, PokemonEntry } from "@/lib/types";

export interface ResolvedMatch<T> {
  entry: T;
  score: number;
  matchType: "exact" | "fuzzy" | "form_alias";
}

function buildUniqueAliasMap<T extends { aliases: string[] }>(entries: T[]) {
  const bucket = new Map<string, T[]>();

  for (const entry of entries) {
    for (const alias of entry.aliases) {
      const normalized = normalizeAlias(alias);
      const existing = bucket.get(normalized) ?? [];
      existing.push(entry);
      bucket.set(normalized, existing);
    }
  }

  const map = new Map<string, T>();

  for (const [alias, matches] of bucket) {
    if (matches.length === 1) {
      map.set(alias, matches[0]);
    }
  }

  return map;
}

const pokemonExactMap = buildUniqueAliasMap(pokemonData);
const moveExactMap = buildUniqueAliasMap(moveData);

const pokemonFuse = new Fuse(pokemonData, {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.3,
  keys: [
    { name: "name", weight: 0.4 },
    { name: "aliases", weight: 0.6 },
  ],
});

const moveFuse = new Fuse(moveData, {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.3,
  keys: [
    { name: "name", weight: 0.4 },
    { name: "aliases", weight: 0.6 },
  ],
});

export function resolvePokemonEntity(query: string): ResolvedMatch<PokemonEntry> | null {
  if (!query.trim()) {
    return null;
  }

  const normalized = normalizeAlias(query);
  const formAliasId = formAliasMap.get(normalized);

  if (formAliasId) {
    const entry = pokemonById.get(formAliasId);
    if (entry) {
      return { entry, score: 0, matchType: "form_alias" };
    }
  }

  const exact = pokemonExactMap.get(normalized);
  if (exact) {
    return { entry: exact, score: 0, matchType: "exact" };
  }

  const fuzzy = pokemonFuse.search(normalized, { limit: 1 })[0];
  if (!fuzzy || (fuzzy.score ?? 1) > 0.3) {
    return null;
  }

  return {
    entry: fuzzy.item,
    score: fuzzy.score ?? 0.3,
    matchType: "fuzzy",
  };
}

export function resolveMoveEntity(query: string): ResolvedMatch<MoveEntry> | null {
  if (!query.trim()) {
    return null;
  }

  const normalized = normalizeAlias(query);
  const exact = moveExactMap.get(normalized);

  if (exact) {
    return { entry: exact, score: 0, matchType: "exact" };
  }

  const fuzzy = moveFuse.search(normalized, { limit: 1 })[0];
  if (!fuzzy || (fuzzy.score ?? 1) > 0.3) {
    return null;
  }

  return {
    entry: fuzzy.item,
    score: fuzzy.score ?? 0.3,
    matchType: "fuzzy",
  };
}

export function searchPokemonEntities(query: string, limit = 5): ResolvedMatch<PokemonEntry>[] {
  if (!query.trim()) {
    return [];
  }

  const normalized = normalizeAlias(query);
  const exact = resolveExactPokemonEntity(query);
  const fuzzyMatches = pokemonFuse.search(normalized, { limit }).filter((match) => {
    return (match.score ?? 1) <= 0.3;
  });
  const results: ResolvedMatch<PokemonEntry>[] = [];

  if (exact) {
    results.push(exact);
  }

  for (const fuzzy of fuzzyMatches) {
    if (results.some((result) => result.entry.id === fuzzy.item.id)) {
      continue;
    }

    results.push({
      entry: fuzzy.item,
      score: fuzzy.score ?? 0.3,
      matchType: "fuzzy",
    });
  }

  return results.slice(0, limit);
}

export function searchMoveEntities(query: string, limit = 5): ResolvedMatch<MoveEntry>[] {
  if (!query.trim()) {
    return [];
  }

  const normalized = normalizeAlias(query);
  const exact = resolveExactMoveEntity(query);
  const fuzzyMatches = moveFuse.search(normalized, { limit }).filter((match) => {
    return (match.score ?? 1) <= 0.3;
  });
  const results: ResolvedMatch<MoveEntry>[] = [];

  if (exact) {
    results.push(exact);
  }

  for (const fuzzy of fuzzyMatches) {
    if (results.some((result) => result.entry.id === fuzzy.item.id)) {
      continue;
    }

    results.push({
      entry: fuzzy.item,
      score: fuzzy.score ?? 0.3,
      matchType: "fuzzy",
    });
  }

  return results.slice(0, limit);
}

export function resolveExactPokemonEntity(query: string): ResolvedMatch<PokemonEntry> | null {
  if (!query.trim()) {
    return null;
  }

  const normalized = normalizeAlias(query);
  const formAliasId = formAliasMap.get(normalized);

  if (formAliasId) {
    const entry = pokemonById.get(formAliasId);
    if (entry) {
      return { entry, score: 0, matchType: "form_alias" };
    }
  }

  const exact = pokemonExactMap.get(normalized);
  if (!exact) {
    return null;
  }

  return { entry: exact, score: 0, matchType: "exact" };
}

export function resolveExactMoveEntity(query: string): ResolvedMatch<MoveEntry> | null {
  if (!query.trim()) {
    return null;
  }

  const exact = moveExactMap.get(normalizeAlias(query));
  if (!exact) {
    return null;
  }

  return { entry: exact, score: 0, matchType: "exact" };
}
