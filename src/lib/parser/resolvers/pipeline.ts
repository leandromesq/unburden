import { resolveAttackerAbilitySuggestion } from "@/lib/parser/resolvers/attacker-ability-resolver";
import { resolveAttackerItemSuggestion } from "@/lib/parser/resolvers/attacker-item-resolver";
import { resolveAttackerModifierSuggestion } from "@/lib/parser/resolvers/attacker-modifier-resolver";
import { resolveAttackerMoveSuggestion } from "@/lib/parser/resolvers/attacker-move-resolver";
import { resolveAttackerSpeciesSuggestion } from "@/lib/parser/resolvers/attacker-species-resolver";
import { isLegacyScopedTokenFragment } from "@/lib/parser/resolvers/context";
import { resolveDefenderAbilitySuggestion } from "@/lib/parser/resolvers/defender-ability-resolver";
import { resolveDefenderItemSuggestion } from "@/lib/parser/resolvers/defender-item-resolver";
import { resolveDefenderModifierSuggestion } from "@/lib/parser/resolvers/defender-modifier-resolver";
import { resolveDefenderSpeciesSuggestion } from "@/lib/parser/resolvers/defender-species-resolver";
import { resolveGlobalModifierSuggestion } from "@/lib/parser/resolvers/global-modifier-resolver";
import { resolveSeparatorSuggestion } from "@/lib/parser/resolvers/separator-resolver";
import type {
  AutocompleteResult,
  SlotResolver,
  SuggestionContext,
} from "@/lib/parser/resolvers/types";

const EMPTY_AUTOCOMPLETE_RESULT: AutocompleteResult = {
  activeSuggestion: null,
  suggestionOptions: [],
};

export const ACTIVE_TOKEN_RESOLVERS: SlotResolver[] = [
  resolveAttackerMoveSuggestion,
  resolveAttackerAbilitySuggestion,
  resolveDefenderAbilitySuggestion,
  resolveGlobalModifierSuggestion,
  resolveAttackerItemSuggestion,
  resolveDefenderItemSuggestion,
  resolveAttackerModifierSuggestion,
  resolveDefenderModifierSuggestion,
];

export const SLOT_RESOLVERS: SlotResolver[] = [
  resolveAttackerSpeciesSuggestion,
  resolveAttackerMoveSuggestion,
  resolveSeparatorSuggestion,
  resolveDefenderSpeciesSuggestion,
  resolveDefenderModifierSuggestion,
];

export function runResolverPipeline(
  context: SuggestionContext,
  resolvers: SlotResolver[],
) {
  for (const resolver of resolvers) {
    const result = resolver(context);
    if (result) {
      return result;
    }
  }

  return null;
}

export function resolveSuggestionPipeline(
  context: SuggestionContext,
): AutocompleteResult {
  if (!context.trailingWhitespace && context.activeToken) {
    const activeRaw = context.raw ?? context.activeToken.raw;
    if (isLegacyScopedTokenFragment(activeRaw)) {
      return EMPTY_AUTOCOMPLETE_RESULT;
    }

    const activeTokenResult = runResolverPipeline(context, ACTIVE_TOKEN_RESOLVERS);
    if (activeTokenResult) {
      return activeTokenResult;
    }
  }

  return runResolverPipeline(context, SLOT_RESOLVERS) ?? EMPTY_AUTOCOMPLETE_RESULT;
}

