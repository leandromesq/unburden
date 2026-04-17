import {
  buildActiveSuggestion,
  getModifierOptions,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveGlobalModifierSuggestion: SlotResolver = (context) => {
  if (!context.activeToken || !context.raw?.startsWith("~")) {
    return null;
  }

  const options = getModifierOptions(
    "global",
    context.raw.slice(1),
    context.input,
    context.activeToken,
  );
  const active = options[0]
    ? buildActiveSuggestion(
        "global_modifier",
        context.raw,
        options[0].value,
        options[0].applyText,
        context.input,
      )
    : null;

  return { activeSuggestion: active, suggestionOptions: options };
};
