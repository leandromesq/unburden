import {
  buildActiveSuggestion,
  buildFullText,
  dedupeOptions,
  getAbilityOptions,
  getItemOptions,
  getModifierOptions,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveDefenderModifierSuggestion: SlotResolver = (context) => {
  if (
    context.activeToken &&
    context.raw &&
    context.activeTokenInDefender &&
    context.defenderExact &&
    !context.activeTokenInDefenderSpecies
  ) {
    const options = dedupeOptions([
      ...getModifierOptions("defender", context.raw, context.input, context.activeToken),
      ...getModifierOptions("global", context.raw, context.input, context.activeToken),
    ]).slice(0, 8);
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
  }

  if (!context.defenderExact) {
    return null;
  }

  const attackerTokens = context.structure.attacker.rawTokens.map((token) => token.raw);
  const defenderTokens = context.structure.defender.rawTokens.map((token) => token.raw);
  const baseInput = buildFullText(
    context.structure,
    attackerTokens,
    defenderTokens,
    true,
  );
  const options = dedupeOptions([
    ...getItemOptions(context.defenderExact.entry.id, "", baseInput),
    ...getAbilityOptions("defender", context.defenderExact.entry.id, "", baseInput),
    ...getModifierOptions("defender", "", baseInput),
    ...getModifierOptions("global", "", baseInput),
  ]).slice(0, 8);

  return {
    activeSuggestion: null,
    suggestionOptions: options,
  };
};
