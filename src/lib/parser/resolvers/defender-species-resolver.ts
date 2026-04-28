import { normalizeAlias } from "@/lib/data/loaders";
import { searchPokemonEntities } from "@/lib/parser/fuse-indexes";
import { joinTokenValues } from "@/lib/parser/tokenize";
import { searchSetReferences } from "@/lib/team/set-references";
import type { SuggestionOption } from "@/lib/types";
import {
  buildActiveSuggestion,
  buildFullText,
  formatSpeciesText,
  getMergedTokenSuffixTokens,
  replaceRangeWithCursor,
} from "@/lib/parser/resolvers/shared";
import type { SlotResolver } from "@/lib/parser/resolvers/types";

const AEGISLASH_DEFENDER_FORMS = [
  {
    label: "Aegislash-Shield",
    value: "aegislash-shield",
    aliases: ["aegislash shield", "aegislash-shield"],
  },
  {
    label: "Aegislash-Blade",
    value: "aegislash-blade",
    aliases: ["aegislash sword", "aegislash-sword", "aegislash blade"],
  },
] as const;

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
        const mergedSuffixTokens =
          context.cursorIndex === context.input.length
            ? []
            : getMergedTokenSuffixTokens(context.activeToken, context.cursorIndex);
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
            : mergedSuffixTokens.length
              ? (() => {
                  const text = buildFullText(
                    context.fullStructure,
                    attackerTokens,
                    [
                      canonicalToken,
                      ...mergedSuffixTokens,
                      ...context.fullStructure.defender.rawTokens
                        .slice(context.fullStructure.defender.leadingFreeTokens.length)
                        .map((token) => token.raw),
                    ].filter(Boolean),
                    true,
                  );
                  const cursorText = buildFullText(
                    context.fullStructure,
                    attackerTokens,
                    [canonicalToken],
                    true,
                  );
                  return [text, cursorText.length] as const;
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

  function buildPokemonOption({
    label,
    speciesText,
  }: {
    label: string;
    speciesText: string;
  }): SuggestionOption {
      const mergedSuffixTokens =
        context.cursorIndex === context.input.length
          ? []
          : getMergedTokenSuffixTokens(context.activeToken, context.cursorIndex);
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
          : mergedSuffixTokens.length
            ? (() => {
                const text = buildFullText(
                  context.fullStructure,
                  attackerTokens,
                  [
                    speciesText,
                    ...mergedSuffixTokens,
                    ...context.fullStructure.defender.rawTokens
                      .slice(context.fullStructure.defender.leadingFreeTokens.length)
                      .map((token) => token.raw),
                  ].filter(Boolean),
                  true,
                );
                const cursorText = buildFullText(
                  context.fullStructure,
                  attackerTokens,
                  [speciesText],
                  true,
                );
                return [text, cursorText.length] as const;
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
        label,
        applyText,
        cursorOffset,
      };
  }

  const normalizedQuery = normalizeAlias(query);
  const aegislashOptions = normalizedQuery
    ? AEGISLASH_DEFENDER_FORMS.filter((form) =>
        form.aliases.some((alias) =>
          normalizeAlias(alias).startsWith(normalizedQuery),
        ),
      ).map((form) =>
        buildPokemonOption({
          label: form.label,
          speciesText: form.value,
        }),
      )
    : [];
  const regularOptions = searchPokemonEntities(query, 6).map((match) =>
    buildPokemonOption({
      label: match.entry.name,
      speciesText: formatSpeciesText(match.entry.name),
    }),
  );
  const options: SuggestionOption[] = [...aegislashOptions, ...regularOptions]
    .filter(
      (option, index, collection) =>
        collection.findIndex((entry) => entry.value === option.value) === index,
    )
    .slice(0, 6);
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
