import {
  learnsetByPokemonId,
  moveById,
  normalizeAlias,
  normalizeId,
  pokemonById,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { buildCommonAbilities } from "@/lib/parser/grammar";
import type { MoveEntry } from "@/lib/types";

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

export function inferFallbackMoves(pokemonId: string, limit = 12) {
  const attacker = pokemonById.get(pokemonId);
  const learnset = learnsetByPokemonId.get(pokemonId);

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

export function getCommonMoves(pokemonId: string, limit = 12) {
  const meta = vgcMetaByPokemonId.get(pokemonId);
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

export function inferDefaultMove(pokemonId: string) {
  return getCommonMoves(pokemonId, 1)[0] ?? null;
}

export function inferDefaultItem(pokemonId: string) {
  return vgcMetaByPokemonId.get(pokemonId)?.defaultItem ?? null;
}

export function inferDefaultAbility(pokemonId: string) {
  const pokemon = pokemonById.get(pokemonId);
  const profile = vgcMetaByPokemonId.get(pokemonId);

  return profile?.defaultAbility ?? pokemon?.abilities[0] ?? null;
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
