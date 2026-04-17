import { searchPokemonEntities } from "@/lib/parser/fuse-indexes";
import { joinTokenValues } from "@/lib/parser/tokenize";
import { searchSetReferences } from "@/lib/team/set-references";
import type { SuggestionOption } from "@/lib/types";
import {
  buildActiveSuggestion,
  buildFullText,
  formatSpeciesText,
  replaceRangeWithCursor,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

export const resolveDefenderSpeciesSuggestion: SlotResolver = (context) => {
  if (context.defenderSpeciesLocked) {
    return null;
  }

  const query = joinTokenValues(context.structure.defender.leadingFreeTokens);
  const attackerTokens = context.structure.attacker.rawTokens.map(
    (token) => token.raw,
  );

  if (query.startsWith("#")) {
    const options = searchSetReferences(query, context.importedSets, 6).map(
      ({ set, canonicalToken }) => {
        const [applyText, cursorOffset] =
          context.cursorIndex === context.input.length || !context.activeToken
            ? (() => {
                const text = buildFullText(
                  context.structure,
                  attackerTokens,
                  [
                    canonicalToken,
                    ...context.structure.defender.rawTokens
                      .slice(context.structure.defender.leadingFreeTokens.length)
                      .map((token) => token.raw),
                  ].filter(Boolean),
                  true,
                );
                return [text, text.length] as const;
              })()
            : replaceRangeWithCursor(
                context.input,
                context.fullStructure.defender.rawTokens[0]?.start ??
                  (context.fullStructure.attacker.rawTokens.at(-1)?.end ?? 0),
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
          "defender_pokemon",
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
              const text = buildFullText(
                context.structure,
                attackerTokens,
                [
                  speciesText,
                  ...context.structure.defender.rawTokens
                    .slice(context.structure.defender.leadingFreeTokens.length)
                    .map((token) => token.raw),
                ].filter(Boolean),
                true,
              );
              return [text, text.length] as const;
            })()
          : replaceRangeWithCursor(
              context.input,
              context.fullStructure.defender.rawTokens[0]?.start ??
                (context.fullStructure.attacker.rawTokens.at(-1)?.end ?? 0),
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
        "defender_pokemon",
        query,
        options[0].value,
        options[0].applyText,
        context.input,
      )
    : null;

  return { activeSuggestion: active, suggestionOptions: options };
};
