import {
  appendTokenWithCursor,
  buildActiveSuggestion,
  dedupeOptions,
  getAbilityOptions,
  getItemOptions,
  getModifierOptions,
  withLabel,
} from "@/lib/parser/resolvers/shared";
import type { SuggestionOption } from "@/lib/types";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveSeparatorSuggestion: SlotResolver = (context) => {
  if (context.structure.lexed.hasDelimiter) {
    return null;
  }

  const [separatorApplyText, separatorCursorOffset] = appendTokenWithCursor(
    context.input,
    "x",
    true,
  );
  const options: SuggestionOption[] = [
    withLabel({
      type: "separator",
      value: "x",
      applyText: separatorApplyText,
      cursorOffset: separatorCursorOffset,
    }),
  ];

  if (context.attackerResolved) {
    options.push(
      ...getItemOptions(context.attackerResolved.entry.id, "", context.input),
      ...getAbilityOptions(
        "attacker",
        context.attackerResolved.entry.id,
        "",
        context.input,
      ),
      ...getModifierOptions("attacker", "", context.input),
    );
  }

  return {
    activeSuggestion: buildActiveSuggestion(
      "separator",
      "",
      "x",
      options[0].applyText,
      context.input,
    ),
    suggestionOptions: dedupeOptions(options).slice(0, 8),
  };
};
