import { getSuggestedMoves } from "@/lib/parser/inference";
import { joinTokenValues } from "@/lib/parser/tokenize";
import {
  buildActiveSuggestion,
  buildAttackerSideTokens,
  buildFullText,
  formatMoveToken,
  replaceLastTokenWithCursor,
  splitMoveFragment,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveAttackerMoveSuggestion: SlotResolver = (context) => {
  if (
    context.activeToken &&
    context.raw &&
    (context.raw.toLowerCase().startsWith("m:") ||
      context.raw.startsWith("!")) &&
    context.attackerResolved
  ) {
    const { moveFragment, hitSuffix } = splitMoveFragment(context.raw);
    const options = getSuggestedMoves(
      context.attackerResolved.entry.id,
      moveFragment,
      8,
    ).map((move) => {
      const token = `${formatMoveToken(move.name)}${hitSuffix}`;

      let applyText: string, cursorOffset: number;
      if (context.activeToken) {
        [applyText, cursorOffset] = replaceLastTokenWithCursor(
          context.input,

          context.activeToken,

          token,
        );
      } else {
        // Fallback: just use the input and token, cursor at end
        applyText = context.input + token;
        cursorOffset = applyText.length;
      }

      return {
        type: "move" as const,
        value: token,
        label: move.name,
        applyText,
        cursorOffset,
      };
    });
    const active = options[0]
      ? buildActiveSuggestion(
          "attacker_move",
          context.raw,
          options[0].value,
          options[0].applyText,
          context.input,
        )
      : null;

    return { activeSuggestion: active, suggestionOptions: options };
  }

  if (
    context.structure.attacker.moveToken ||
    !context.attackerSpeciesLocked ||
    !context.attackerResolved
  ) {
    return null;
  }

  const query = joinTokenValues(
    context.structure.attacker.leadingRemainderTokens,
  );
  const options = getSuggestedMoves(
    context.attackerResolved.entry.id,
    query,
    8,
  ).map((move) => {
    const token = formatMoveToken(move.name);
    const [applyText, cursorOffset] =
      context.cursorIndex === context.input.length || !context.activeToken
        ? (() => {
            const text = buildFullText(
              context.structure,
              buildAttackerSideTokens(
                context.structure,
                token,
                context.attackerReferenceToken,
              ),
              context.structure.lexed.hasDelimiter
                ? context.structure.defender.rawTokens.map((entry) => entry.raw)
                : undefined,
              context.structure.lexed.hasDelimiter,
            );
            return [text, text.length] as const;
          })()
        : replaceLastTokenWithCursor(context.input, context.activeToken, token);

    return {
      type: "move" as const,
      value: token,
      label: move.name,
      applyText,
      cursorOffset,
    };
  });
  const active = options[0]
    ? buildActiveSuggestion(
        "attacker_move",
        query,
        options[0].value,
        options[0].applyText,
        context.input,
      )
    : null;

  return { activeSuggestion: active, suggestionOptions: options };
};
