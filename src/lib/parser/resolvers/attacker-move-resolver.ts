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
    const attackerTokens = buildAttackerSideTokens(
      context.fullStructure,
      token,
      context.attackerReferenceToken,
    );
    const [applyText, cursorOffset] = (() => {
      const text = buildFullText(
        context.fullStructure,
        attackerTokens,
        context.fullStructure.lexed.hasDelimiter
          ? context.fullStructure.defender.rawTokens.map((entry) => entry.raw)
          : undefined,
        context.fullStructure.lexed.hasDelimiter,
      );
      const cursorText = buildFullText(
        context.fullStructure,
        attackerTokens.slice(0, 2),
      );
      return [text, cursorText.length] as const;
    })();

    return {
      type: "move" as const,
      value: token,
      label: move.name,
      applyText,
      cursorOffset,
    };
  });
  if (options.length === 0) {
    return null;
  }
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
