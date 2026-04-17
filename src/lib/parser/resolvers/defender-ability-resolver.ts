import { buildActiveSuggestion, getAbilityOptions } from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveDefenderAbilitySuggestion: SlotResolver = (context) => {
  if (!context.activeToken || !context.raw?.startsWith("[") || !context.activeTokenInDefender) {
    return null;
  }

  const query = context.raw.slice(1).replace(/\]$/g, "");
  const abilityPokemonId = context.defenderExact?.entry.id;
  const options = abilityPokemonId
    ? getAbilityOptions(
        "defender",
        abilityPokemonId,
        query,
        context.input,
        context.activeToken,
      )
    : [];
  const active = options[0]
    ? buildActiveSuggestion(
        "defender_modifier_or_item_or_ability",
        context.raw,
        options[0].value,
        options[0].applyText,
        context.input,
      )
    : null;

  return { activeSuggestion: active, suggestionOptions: options };
};
