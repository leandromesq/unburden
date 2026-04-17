import {
  buildActiveSuggestion,
  dedupeOptions,
  getModifierOptions,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveAttackerModifierSuggestion: SlotResolver = (context) => {
  if (
    !context.activeToken ||
    !context.raw ||
    !context.activeTokenInAttacker ||
    !context.fullStructure.attacker.moveToken ||
    context.activeTokenInAttackerSpecies ||
    context.activeToken.start <
      (context.fullStructure.attacker.moveToken.source.end ?? 0)
  ) {
    return null;
  }

  const options = dedupeOptions([
    ...getModifierOptions("attacker", context.raw, context.input, context.activeToken),
    ...getModifierOptions("global", context.raw, context.input, context.activeToken),
  ]).slice(0, 8);
  const active = options[0]
    ? buildActiveSuggestion(
        "attacker_modifier_or_item_or_ability",
        context.raw,
        options[0].value,
        options[0].applyText,
        context.input,
      )
    : null;

  return { activeSuggestion: active, suggestionOptions: options };
};
