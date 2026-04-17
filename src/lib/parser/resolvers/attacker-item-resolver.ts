import { buildActiveSuggestion, getItemOptions } from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveAttackerItemSuggestion: SlotResolver = (context) => {
  if (!context.activeToken || !context.raw?.startsWith("@") || context.activeTokenInDefender) {
    return null;
  }

  const targetPokemonId = context.attackerResolved?.entry.id;
  const options = targetPokemonId
    ? getItemOptions(
        targetPokemonId,
        context.raw.slice(1),
        context.input,
        context.activeToken,
      )
    : [];
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
