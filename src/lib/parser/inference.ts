import {
  itemDisplayById,
  learnsetByPokemonId,
  moveById,
  normalizeAlias,
  normalizeId,
  pokemonById,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { buildCommonAbilities } from "@/lib/parser/grammar";
import type { MoveEntry } from "@/lib/types";

const AUTO_GLOBAL_ABILITY_TOKEN_MAP = new Map<string, string>([
  ["drought", "sun"],
  ["orichalcumpulse", "sun"],
  ["desolateland", "sun"],
  ["drizzle", "rain"],
  ["primordialsea", "rain"],
  ["sandstream", "sand"],
  ["snowwarning", "snow"],
  ["electricsurge", "electric-terrain"],
  ["hadronengine", "electric-terrain"],
  ["grassysurge", "grassy-terrain"],
  ["psychicsurge", "psychic-terrain"],
  ["mistysurge", "misty-terrain"],
]);

function dedupeMoves(moves: Array<MoveEntry | null | undefined>) {
  const seen = new Set<string>();

  return moves.filter((move): move is MoveEntry => {
    if (!move || seen.has(move.id)) {
      return false;
    }

    seen.add(move.id);
    return true;
  });
}

function resolveLearnsetPokemonId(pokemonId: string) {
  const pokemon = pokemonById.get(pokemonId);
  if (!pokemon) {
    return pokemonId;
  }

  if (learnsetByPokemonId.has(pokemon.id)) {
    return pokemon.id;
  }

  if (pokemon.baseSpeciesId && learnsetByPokemonId.has(pokemon.baseSpeciesId)) {
    return pokemon.baseSpeciesId;
  }

  if (pokemon.defaultFormOf && learnsetByPokemonId.has(pokemon.defaultFormOf)) {
    return pokemon.defaultFormOf;
  }

  return pokemon.id;
}

function inferFallbackMoves(pokemonId: string, limit = 12) {
  const attacker = pokemonById.get(pokemonId);
  const learnset = learnsetByPokemonId.get(resolveLearnsetPokemonId(pokemonId));

  if (!attacker || !learnset) {
    return [];
  }

  const damagingMoves = learnset.moveIds
    .map((moveId) => moveById.get(moveId))
    .filter((move): move is MoveEntry => Boolean(move))
    .filter((move) => move.basePower > 0 && move.category !== "Status");

  if (!damagingMoves.length) {
    return [];
  }

  const stabMoves = damagingMoves.filter((move) => attacker.types.includes(move.type));
  const stabPool = stabMoves.length ? stabMoves : damagingMoves;
  const accurateMoves = stabPool.filter((move) => (move.accuracy ?? 101) >= 85);
  const accuracyPool = accurateMoves.length ? accurateMoves : stabPool;

  return [...accuracyPool]
    .sort((left, right) => {
      if (right.basePower !== left.basePower) {
        return right.basePower - left.basePower;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}

function getCommonMoves(pokemonId: string, limit = 12) {
  const pokemon = pokemonById.get(pokemonId);
  const meta =
    vgcMetaByPokemonId.get(pokemonId) ??
    (pokemon?.baseSpeciesId ? vgcMetaByPokemonId.get(pokemon.baseSpeciesId) : undefined);
  const curatedMoves = (meta?.commonMoves ?? []).map((moveName) =>
    moveById.get(normalizeId(moveName)),
  );
  const defaultMove = meta?.defaultMove
    ? moveById.get(normalizeId(meta.defaultMove))
    : null;

  return dedupeMoves([
    defaultMove,
    ...curatedMoves,
    ...inferFallbackMoves(pokemonId, limit * 2),
  ]).slice(0, limit);
}

export function getSuggestedItems(pokemonId: string, query = "", limit = 6) {
  const pokemon = pokemonById.get(pokemonId);
  const meta =
    vgcMetaByPokemonId.get(pokemonId) ??
    (pokemon?.baseSpeciesId ? vgcMetaByPokemonId.get(pokemon.baseSpeciesId) : undefined);
  const normalizedQuery = normalizeAlias(query);
  const curatedItems = [
    meta?.defaultItem,
    ...(meta?.commonItems ?? []),
    pokemon?.requiredItem,
  ].filter((itemName): itemName is string => Boolean(itemName));
  const globalMatches = Array.from(itemDisplayById.values()).filter((itemName) => {
    if (!normalizedQuery) {
      return false;
    }

    return normalizeAlias(itemName).includes(normalizedQuery);
  });
  const scoreItem = (itemName: string) => {
    const normalizedItem = normalizeAlias(itemName);

    if (!normalizedQuery) {
      return 0;
    }

    if (normalizedItem.startsWith(normalizedQuery)) {
      return 0;
    }

    if (normalizedItem.includes(normalizedQuery)) {
      return 1;
    }

    return 2;
  };

  return Array.from(new Set([...curatedItems, ...globalMatches]))
    .filter((itemName) => scoreItem(itemName) < 2)
    .sort((left, right) => {
      const scoreDelta = scoreItem(left) - scoreItem(right);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const leftCuratedIndex = curatedItems.indexOf(left);
      const rightCuratedIndex = curatedItems.indexOf(right);
      if (leftCuratedIndex !== -1 || rightCuratedIndex !== -1) {
        if (leftCuratedIndex === -1) {
          return 1;
        }
        if (rightCuratedIndex === -1) {
          return -1;
        }

        return leftCuratedIndex - rightCuratedIndex;
      }

      return left.localeCompare(right);
    })
    .slice(0, limit);
}

export function getAutoGlobalTokenForAbilityName(ability: string | undefined) {
  if (!ability) {
    return null;
  }

  return AUTO_GLOBAL_ABILITY_TOKEN_MAP.get(normalizeId(ability)) ?? null;
}

export function inferDefaultAbility(pokemonId: string) {
  const pokemon = pokemonById.get(pokemonId);
  const profile = vgcMetaByPokemonId.get(pokemonId);
  const normalizedAbilities = new Set(
    (pokemon?.abilities ?? []).map((ability) => normalizeId(ability)),
  );
  const profileAbility =
    profile?.defaultAbility && normalizedAbilities.has(normalizeId(profile.defaultAbility))
      ? profile.defaultAbility
      : null;
  const automaticFieldAbility =
    pokemon?.abilities.find((ability) => getAutoGlobalTokenForAbilityName(ability)) ?? null;

  return (
    profileAbility ??
    automaticFieldAbility ??
    pokemon?.abilities[0] ??
    profile?.defaultAbility ??
    null
  );
}

export function getSuggestedMoves(pokemonId: string, query = "", limit = 8) {
  const pool = getCommonMoves(pokemonId, limit * 3);
  const normalizedQuery = normalizeAlias(query);

  if (!normalizedQuery) {
    return pool.slice(0, limit);
  }

  const scoreMove = (move: MoveEntry) => {
    const aliases = [move.name, ...move.aliases].map((alias) => normalizeAlias(alias));
    const exactPrefix = aliases.some((alias) => alias.startsWith(normalizedQuery));
    const contains = aliases.some((alias) => alias.includes(normalizedQuery));

    if (exactPrefix) {
      return 0;
    }

    if (contains) {
      return 1;
    }

    return 2;
  };

  return [...pool]
    .sort((left, right) => {
      const scoreDelta = scoreMove(left) - scoreMove(right);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.name.localeCompare(right.name);
    })
    .filter((move) => scoreMove(move) < 2)
    .slice(0, limit);
}

export function getSuggestedAbilities(pokemonId: string, query = "", limit = 6) {
  const pokemon = pokemonById.get(pokemonId);
  if (!pokemon) {
    return [];
  }

  const abilities = buildCommonAbilities(vgcMetaByPokemonId.get(pokemonId), pokemon.abilities);
  const normalizedQuery = normalizeAlias(query);

  const scoreAbility = (ability: string) => {
    const normalizedAbility = normalizeAlias(ability);
    if (!normalizedQuery) {
      return 0;
    }
    if (normalizedAbility.startsWith(normalizedQuery)) {
      return 0;
    }
    if (normalizedAbility.includes(normalizedQuery)) {
      return 1;
    }

    return 2;
  };

  return abilities
    .filter((ability) => scoreAbility(ability) < 2)
    .sort((left, right) => {
      const scoreDelta = scoreAbility(left) - scoreAbility(right);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return left.localeCompare(right);
    })
    .slice(0, limit);
}
