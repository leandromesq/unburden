import {
  normalizeId,
  pokemonById,
} from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import type { SuggestionContext } from "@/lib/parser/resolvers/types";
import { type LexToken } from "@/lib/parser/tokenize";
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import type { ImportedSet } from "@/lib/types";

function getActiveToken(tokens: LexToken[], cursorIndex: number) {
  return (
    tokens.find((token) => cursorIndex > token.start && cursorIndex <= token.end) ??
    [...tokens].reverse().find((token) => token.end === cursorIndex) ??
    null
  );
}

function isTokenInCollection(token: LexToken | null, collection: LexToken[]) {
  if (!token) {
    return false;
  }

  return collection.some(
    (entry) => entry.start === token.start && entry.end === token.end,
  );
}

export function isLegacyScopedTokenFragment(raw: string) {
  return /^(?:[adg]:|>|<)/i.test(raw);
}

export function buildSuggestionContext(
  input: string,
  cursorIndex = input.length,
  importedSets: Record<string, ImportedSet> = {},
): SuggestionContext {
  const fullStructure = analyzeCommandStructure(input);
  const structure =
    cursorIndex === input.length
      ? fullStructure
      : analyzeCommandStructure(input.slice(0, cursorIndex));
  const activeToken = getActiveToken(fullStructure.lexed.tokens, cursorIndex);
  const trailingWhitespace = structure.lexed.trailingWhitespace;
  const attackerReferenceSet = resolveSetReferenceToken(
    structure.attacker.leadingFreeTokens[0]?.raw,
    importedSets,
  );
  const defenderReferenceSet = resolveSetReferenceToken(
    structure.defender.leadingFreeTokens[0]?.raw,
    importedSets,
  );
  const attackerReferencePokemon = attackerReferenceSet
    ? pokemonById.get(normalizeId(attackerReferenceSet.speciesId)) ?? null
    : null;
  const defenderReferencePokemon = defenderReferenceSet
    ? pokemonById.get(normalizeId(defenderReferenceSet.speciesId)) ?? null
    : null;
  const attackerExact = structure.attacker.speciesExact;
  const attackerReferenceToken =
    attackerReferenceSet && structure.attacker.leadingFreeTokens.length >= 1
      ? structure.attacker.leadingFreeTokens[0]?.raw ?? null
      : null;
  const attackerResolved = attackerReferencePokemon
    ? { entry: attackerReferencePokemon }
    : attackerExact ?? structure.attacker.speciesMatch;
  const attackerSpeciesLocked = Boolean(attackerReferencePokemon || attackerExact);
  const defenderExact = defenderReferencePokemon
    ? { entry: defenderReferencePokemon }
    : structure.defender.speciesExact;
  const defenderSpeciesLocked = Boolean(
    defenderReferencePokemon || structure.defender.speciesExact,
  );
  const raw =
    !trailingWhitespace && activeToken
      ? input.slice(activeToken.start, cursorIndex) || activeToken.raw
      : null;

  return {
    input,
    cursorIndex,
    importedSets,
    fullStructure,
    structure,
    activeToken,
    raw,
    trailingWhitespace,
    attackerReferenceToken,
    attackerResolved,
    attackerSpeciesLocked,
    defenderExact,
    defenderSpeciesLocked,
    activeTokenInAttacker: isTokenInCollection(
      activeToken,
      fullStructure.attacker.rawTokens,
    ),
    activeTokenInDefender: isTokenInCollection(
      activeToken,
      fullStructure.defender.rawTokens,
    ),
    activeTokenInAttackerSpecies: isTokenInCollection(
      activeToken,
      fullStructure.attacker.speciesTokens,
    ),
    activeTokenInDefenderSpecies: isTokenInCollection(
      activeToken,
      fullStructure.defender.speciesTokens,
    ),
  };
}

