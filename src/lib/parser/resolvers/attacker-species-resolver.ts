import { searchPokemonEntities } from "@/lib/parser/fuse-indexes";
import { compactWhitespace, joinTokenValues } from "@/lib/parser/tokenize";
import { searchSetReferences } from "@/lib/team/set-references";
import type { SuggestionOption } from "@/lib/types";
import {
  buildActiveSuggestion,
  formatSpeciesText,
  replaceRangeWithCursor,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveAttackerSpeciesSuggestion: SlotResolver = (context) => {
  if (context.attackerSpeciesLocked) {
    return null;
  }

  const query = joinTokenValues(context.structure.attacker.leadingFreeTokens);
  if (query.startsWith("#")) {
    const options = searchSetReferences(query, context.importedSets, 6).map(
      ({ set, canonicalToken }) => {
        const [applyText, cursorOffset] =
          context.cursorIndex === context.input.length || !context.activeToken
            ? (() => {
                const text = compactWhitespace(
                  [
                    canonicalToken,
                    ...context.structure.attacker.rawTokens
                      .slice(context.structure.attacker.leadingFreeTokens.length)
                      .map((token) => token.raw),
                  ].join(" "),
                );
                return [text, canonicalToken.length] as const;
              })()
            : replaceRangeWithCursor(
                context.input,
                context.fullStructure.attacker.rawTokens[0]?.start ?? 0,
                context.activeToken.end,
                canonicalToken,
              );

        return {
          type: "set" as const,
          value: canonicalToken,
          label: set.nickname
            ? `${set.nickname} · ${set.speciesName}`
            : set.speciesName,
          applyText,
          cursorOffset,
        };
      },
    );
    const active = options[0]
      ? buildActiveSuggestion(
          "attacker_pokemon",
          query,
          options[0].value,
          options[0].applyText,
          context.input,
        )
      : null;

    return { activeSuggestion: active, suggestionOptions: options };
  }

  const options: SuggestionOption[] = searchPokemonEntities(query, 6).map(
    (match) => {
      const speciesText = formatSpeciesText(match.entry.name);
      const [applyText, cursorOffset] =
        context.cursorIndex === context.input.length || !context.activeToken
          ? (() => {
              const text = compactWhitespace(
                [
                  speciesText,
                  ...context.structure.attacker.rawTokens
                    .slice(context.structure.attacker.leadingFreeTokens.length)
                    .map((token) => token.raw),
                ].join(" "),
              );
              return [
                text,
                speciesText.length + (text.length > speciesText.length ? 1 : 0),
              ] as const;
            })()
          : replaceRangeWithCursor(
              context.input,
              context.fullStructure.attacker.rawTokens[0]?.start ?? 0,
              context.activeToken.end,
              speciesText,
            );

      return {
        type: "pokemon",
        value: speciesText,
        label: match.entry.name,
        applyText,
        cursorOffset,
      };
    },
  );
  const active = options[0]
    ? buildActiveSuggestion(
        "attacker_pokemon",
        query,
        options[0].value,
        options[0].applyText,
        context.input,
      )
    : null;

  return { activeSuggestion: active, suggestionOptions: options };
};
