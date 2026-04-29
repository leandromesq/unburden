import {
  normalizeId,
} from "@/lib/data/normalization";
import {
  pokemonById,
} from "@/lib/data/pokemon";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { resolveExactPokemonEntity } from "@/lib/parser/fuse-indexes";
import { getSuggestedMoves } from "@/lib/parser/inference";
import { buildSuggestionContext } from "@/lib/parser/resolvers/context";
import { resolveSuggestionPipeline } from "@/lib/parser/resolvers/pipeline";
import {
  formatMoveToken,
} from "@/lib/parser/resolvers/shared";
import type {
  AutocompleteResult,
} from "@/lib/parser/resolvers/types";
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import type { ImportedSet } from "@/lib/types";

function getSlotSuggestions(
  input: string,
  cursorIndex = input.length,
  importedSets: Record<string, ImportedSet> = {},
): AutocompleteResult {
  return resolveSuggestionPipeline(
    buildSuggestionContext(input, cursorIndex, importedSets),
  );
}

export function getAutocompleteState(
  input: string,
  cursorIndex = input.length,
  importedSets: Record<string, ImportedSet> = {},
): AutocompleteResult {
  return getSlotSuggestions(input, cursorIndex, importedSets);
}

export function getInlineSuggestion(
  input: string,
  cursorIndex?: number,
  importedSets: Record<string, ImportedSet> = {},
) {
  const { activeSuggestion } = getSlotSuggestions(
    input,
    cursorIndex ?? input.length,
    importedSets,
  );
  return {
    ghostText: activeSuggestion?.ghostText ?? "",
    completionText: activeSuggestion?.completionText ?? null,
  };
}

export function getContextualMoveSuggestions(
  input: string,
  importedSets: Record<string, ImportedSet> = {},
) {
  const structure = analyzeCommandStructure(input);
  const attackerReferenceSet = resolveSetReferenceToken(
    structure.attacker.leadingFreeTokens[0]?.raw,
    importedSets,
  );
  const attacker =
    (attackerReferenceSet
      ? {
        entry:
          pokemonById.get(normalizeId(attackerReferenceSet.speciesId)) ?? null,
      }
      : null) ??
    structure.attacker.speciesExact ??
    resolveExactPokemonEntity(structure.attacker.speciesText);

  if (!attacker || !attacker.entry) {
    return [];
  }

  return getSuggestedMoves(attacker.entry.id, "", 6).map((move) => formatMoveToken(move.name));
}
