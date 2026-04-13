import {
  normalizeAlias,
  normalizeId,
  pokemonById,
} from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  ATTACKER_CHIP_DEFINITIONS,
  DEFENDER_CHIP_DEFINITIONS,
  GLOBAL_CHIP_DEFINITIONS,
  formatAbilityToken,
  formatModifierToken,
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import {
  resolveExactPokemonEntity,
  searchPokemonEntities,
} from "@/lib/parser/fuse-indexes";
import {
  getSuggestedAbilities,
  getSuggestedItems,
  getSuggestedMoves,
} from "@/lib/parser/inference";
import { compactWhitespace, joinTokenValues, type LexToken } from "@/lib/parser/tokenize";
import { resolveSetReferenceToken, searchSetReferences } from "@/lib/team/set-references";
import type { ImportedSet, SuggestionOption, SuggestionState } from "@/lib/types";

interface AutocompleteResult {
  activeSuggestion: SuggestionState | null;
  suggestionOptions: SuggestionOption[];
}

function getActiveToken(tokens: LexToken[], cursorIndex: number) {
  return (
    tokens.find((token) => cursorIndex > token.start && cursorIndex <= token.end) ??
    [...tokens].reverse().find((token) => token.end === cursorIndex) ??
    null
  );
}

function replaceRange(input: string, start: number, end: number, replacement: string) {
  return compactWhitespace(`${input.slice(0, start)}${replacement}${input.slice(end)}`);
}

function formatSpeciesText(name: string) {
  const normalized = normalizeAlias(name);

  if (/-mega/i.test(name)) {
    return normalized.replace(/\s+/g, "-");
  }

  return normalized;
}

function formatMoveToken(moveId: string) {
  return `!${slugifySymbolValue(moveId)}`;
}

function splitMoveFragment(raw: string) {
  const value = raw.toLowerCase().startsWith("m:") ? raw.slice(2) : raw.slice(1);
  const hitSuffixMatch = value.match(/\(\d*\)?$/);
  const hitSuffix = hitSuffixMatch?.[0] ?? "";

  return {
    moveFragment: hitSuffix ? value.slice(0, -hitSuffix.length) : value,
    hitSuffix,
  };
}

function formatItemToken(itemName: string) {
  return `@${slugifySymbolValue(itemName)}`;
}

function getGhostSuffix(fragment: string, candidate: string) {
  const lowerFragment = fragment.toLowerCase();
  const lowerCandidate = candidate.toLowerCase();

  if (!lowerFragment) {
    return candidate;
  }

  if (!lowerCandidate.startsWith(lowerFragment)) {
    return "";
  }

  return candidate.slice(fragment.length);
}

function appendToken(input: string, token: string, addTrailingSpace = false) {
  const base = input.trimEnd();
  const next = base ? `${base} ${token}` : token;
  return addTrailingSpace ? `${next} ` : next;
}

function replaceLastToken(input: string, token: LexToken, replacement: string) {
  const next = `${input.slice(0, token.start)}${replacement}${input.slice(token.end)}`;
  return compactWhitespace(next);
}

function isTokenInCollection(token: LexToken | null, collection: LexToken[]) {
  if (!token) {
    return false;
  }

  return collection.some(
    (entry) => entry.start === token.start && entry.end === token.end,
  );
}

function withLabel(option: Omit<SuggestionOption, "label">): SuggestionOption {
  return {
    ...option,
    label: option.value,
  };
}

function dedupeOptions(options: SuggestionOption[]) {
  return options.filter(
    (option, index, collection) =>
      collection.findIndex((entry) => entry.applyText === option.applyText) === index,
  );
}

function isLegacyScopedTokenFragment(raw: string) {
  return /^(?:[adg]:|>|<)/i.test(raw);
}

function buildAttackerSideTokens(
  structure: ReturnType<typeof analyzeCommandStructure>,
  moveToken?: string,
  attackerReferenceToken?: string | null,
) {
  const attackerSpecies = attackerReferenceToken
    ? attackerReferenceToken
    : structure.attacker.speciesExact
      ? formatSpeciesText(structure.attacker.speciesExact.entry.name)
      : structure.attacker.speciesMatch
      ? formatSpeciesText(structure.attacker.speciesMatch.entry.name)
      : joinTokenValues(structure.attacker.leadingFreeTokens);
  const explicitTokens = structure.attacker.symbolTokens
    .filter((token) => token.kind !== "move")
    .map((token) => token.raw);

  return [attackerSpecies, moveToken, ...explicitTokens].filter(Boolean) as string[];
}

function buildFullText(
  structure: ReturnType<typeof analyzeCommandStructure>,
  attackerTokens: string[],
  defenderTokens?: string[],
  forceDelimiter?: boolean,
) {
  if (forceDelimiter || structure.lexed.hasDelimiter || (defenderTokens && defenderTokens.length)) {
    return [...attackerTokens, "x", ...(defenderTokens ?? [])].join(" ").trim();
  }

  return attackerTokens.join(" ").trim();
}

function buildActiveSuggestion(
  slot: SuggestionState["slot"],
  fragment: string,
  candidate: string,
  completionText: string,
  currentInput: string,
) {
  const ghostText = getGhostSuffix(fragment, candidate);
  if (!ghostText && compactWhitespace(completionText) === compactWhitespace(currentInput)) {
    return null;
  }

  return {
    slot,
    ghostText,
    completionText,
  } satisfies SuggestionState;
}

function getModifierOptions(
  scope: "attacker" | "defender" | "global",
  query: string,
  input: string,
  lastToken?: LexToken,
) {
  const catalog =
    scope === "attacker"
      ? ATTACKER_CHIP_DEFINITIONS
      : scope === "defender"
        ? DEFENDER_CHIP_DEFINITIONS
        : GLOBAL_CHIP_DEFINITIONS;
  const normalizedQuery = slugifySymbolValue(query);
  const matches = catalog.filter((definition) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      definition.token.startsWith(normalizedQuery) ||
      definition.label.toLowerCase().includes(normalizedQuery.replace(/-/g, " "))
    );
  });

  return matches.slice(0, 8).map((definition) => {
    const token = formatModifierToken(scope, definition.token);
    const applyText = lastToken
      ? replaceLastToken(input, lastToken, token)
      : appendToken(input, token);

    return withLabel({
      type: "modifier",
      value: token,
      applyText,
    });
  });
}

function getAbilityOptions(
  scope: "attacker" | "defender",
  pokemonId: string,
  query: string,
  input: string,
  lastToken?: LexToken,
) {
  return getSuggestedAbilities(pokemonId, query, 6).map((ability) => {
    const token = formatAbilityToken(scope, ability);
    const applyText = lastToken
      ? replaceLastToken(input, lastToken, token)
      : appendToken(input, token);

    return {
      type: "ability",
      value: token,
      label: ability,
      applyText,
    } satisfies SuggestionOption;
  });
}

function getItemOptions(
  pokemonId: string,
  query: string,
  input: string,
  lastToken?: LexToken,
) {
  return getSuggestedItems(pokemonId, query, 6).map((itemName) => {
    const token = formatItemToken(itemName);
    const applyText = lastToken
      ? replaceLastToken(input, lastToken, token)
      : appendToken(input, token);

    return {
      type: "item",
      value: token,
      label: itemName,
      applyText,
    } satisfies SuggestionOption;
  });
}

function getSlotSuggestions(
  input: string,
  cursorIndex = input.length,
  importedSets: Record<string, ImportedSet> = {},
): AutocompleteResult {
  const fullStructure = analyzeCommandStructure(input);
  const structure = cursorIndex === input.length
    ? fullStructure
    : analyzeCommandStructure(input.slice(0, cursorIndex));
  const lastToken = structure.lexed.tokens.at(-1);
  const activeToken = getActiveToken(fullStructure.lexed.tokens, cursorIndex) ?? lastToken ?? null;
  const trailingWhitespace = structure.lexed.trailingWhitespace;
  const attackerReferenceSet = resolveSetReferenceToken(
    structure.attacker.leadingFreeTokens[0]?.raw,
    importedSets,
  );
  const defenderReferenceSet = resolveSetReferenceToken(
    structure.defender.leadingFreeTokens[0]?.raw,
    importedSets,
  );
  const attackerReferencePokemon = attackerReferenceSet
    ? pokemonById.get(normalizeId(attackerReferenceSet.speciesId)) ?? null
    : null;
  const defenderReferencePokemon = defenderReferenceSet
    ? pokemonById.get(normalizeId(defenderReferenceSet.speciesId)) ?? null
    : null;
  const attackerExact = structure.attacker.speciesExact;
  const attackerReferenceToken =
    attackerReferenceSet && structure.attacker.leadingFreeTokens.length >= 1
      ? structure.attacker.leadingFreeTokens[0]?.raw ?? null
      : null;
  const attackerResolved = attackerReferencePokemon
    ? { entry: attackerReferencePokemon }
    : attackerExact ?? structure.attacker.speciesMatch;
  const attackerSpeciesLocked = Boolean(attackerReferencePokemon || attackerExact);
  const defenderExact = defenderReferencePokemon
    ? { entry: defenderReferencePokemon }
    : structure.defender.speciesExact;
  const defenderSpeciesLocked = Boolean(defenderReferencePokemon || structure.defender.speciesExact);

  if (!trailingWhitespace && activeToken) {
    const raw = input.slice(activeToken.start, cursorIndex) || activeToken.raw;
    if (isLegacyScopedTokenFragment(raw)) {
      return {
        activeSuggestion: null,
        suggestionOptions: [],
      };
    }
    const activeTokenInAttacker = isTokenInCollection(
      activeToken,
      fullStructure.attacker.rawTokens,
    );
    const activeTokenInDefender = isTokenInCollection(
      activeToken,
      fullStructure.defender.rawTokens,
    );
    const activeTokenInAttackerSpecies = isTokenInCollection(
      activeToken,
      fullStructure.attacker.speciesTokens,
    );
    const activeTokenInDefenderSpecies = isTokenInCollection(
      activeToken,
      fullStructure.defender.speciesTokens,
    );

    if ((raw.toLowerCase().startsWith("m:") || raw.startsWith("!")) && attackerResolved) {
      const { moveFragment, hitSuffix } = splitMoveFragment(raw);
      const query = moveFragment;
      const options = getSuggestedMoves(attackerResolved.entry.id, query, 8).map((move) => {
        const token = `${formatMoveToken(move.name)}${hitSuffix}`;
        return {
          type: "move",
          value: token,
          label: move.name,
          applyText: replaceLastToken(input, activeToken, token),
        } satisfies SuggestionOption;
      });
      const active = options[0]
        ? buildActiveSuggestion(
            "attacker_move",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    if (raw.startsWith("[")) {
      const query = (
        raw.slice(1)
      ).replace(/\]$/g, "");
      const abilityScope =
        activeTokenInDefender
          ? "defender"
          : "attacker";
      const abilityPokemonId =
        abilityScope === "attacker"
          ? attackerResolved?.entry.id
          : defenderExact?.entry.id;
      const options = abilityPokemonId
        ? getAbilityOptions(
            abilityScope,
            abilityPokemonId,
            query,
            input,
            activeToken,
          )
        : [];
      const active = options[0]
        ? buildActiveSuggestion(
            abilityScope === "attacker"
              ? "attacker_modifier_or_item_or_ability"
              : "defender_modifier_or_item_or_ability",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }
    if (raw.startsWith("~")) {
      const options = getModifierOptions(
        "global",
        raw.slice(1),
        input,
        activeToken,
      );
      const active = options[0]
        ? buildActiveSuggestion(
            "global_modifier",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    if (raw.startsWith("@")) {
      const isDefenderToken = fullStructure.defender.rawTokens.some(
        (token) =>
          token.start === activeToken.start && token.end === activeToken.end,
      );
      const targetPokemonId = isDefenderToken
        ? defenderExact?.entry.id
        : attackerResolved?.entry.id;
      const options = targetPokemonId
        ? getItemOptions(targetPokemonId, raw.slice(1), input, activeToken)
        : [];
      const active = options[0]
        ? buildActiveSuggestion(
            isDefenderToken
              ? "defender_modifier_or_item_or_ability"
              : "attacker_modifier_or_item_or_ability",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    const attackerBareModifierContext =
      activeTokenInAttacker &&
      Boolean(fullStructure.attacker.moveToken) &&
      !activeTokenInAttackerSpecies &&
      activeToken.start >= (fullStructure.attacker.moveToken?.source.end ?? 0);
    const defenderBareModifierContext =
      activeTokenInDefender &&
      Boolean(defenderExact) &&
      !activeTokenInDefenderSpecies;

    if (attackerBareModifierContext) {
      const options = dedupeOptions([
        ...getModifierOptions("attacker", raw, input, activeToken),
        ...getModifierOptions("global", raw, input, activeToken),
      ]).slice(0, 8);
      const active = options[0]
        ? buildActiveSuggestion(
            "attacker_modifier_or_item_or_ability",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    if (defenderBareModifierContext) {
      const options = dedupeOptions([
        ...getModifierOptions("defender", raw, input, activeToken),
        ...getModifierOptions("global", raw, input, activeToken),
      ]).slice(0, 8);
      const active = options[0]
        ? buildActiveSuggestion(
            "defender_modifier_or_item_or_ability",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }
  }

  if (!attackerSpeciesLocked) {
    const query = joinTokenValues(structure.attacker.leadingFreeTokens);
    if (query.startsWith("#")) {
      const matches = searchSetReferences(query, importedSets, 6);
      const options = matches.map(({ set, canonicalToken }) => ({
        type: "set" as const,
        value: canonicalToken,
        label: set.nickname
          ? `${set.nickname} · ${set.speciesName}`
          : set.speciesName,
        applyText:
          cursorIndex === input.length || !activeToken
            ? compactWhitespace([
                canonicalToken,
                ...structure.attacker.rawTokens
                  .slice(structure.attacker.leadingFreeTokens.length)
                  .map((token) => token.raw),
              ].join(" "))
            : replaceRange(
                input,
                fullStructure.attacker.rawTokens[0]?.start ?? 0,
                activeToken.end,
                canonicalToken,
              ),
      }));
      const active = options[0]
        ? buildActiveSuggestion(
            "attacker_pokemon",
            query,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    const matches = searchPokemonEntities(query, 6);
    const options = matches.map((match) => {
      const speciesText = formatSpeciesText(match.entry.name);
      const applyText =
        cursorIndex === input.length || !activeToken
          ? compactWhitespace([
              speciesText,
              ...structure.attacker.rawTokens
                .slice(structure.attacker.leadingFreeTokens.length)
                .map((token) => token.raw),
            ].join(" "))
          : replaceRange(
              input,
              fullStructure.attacker.rawTokens[0]?.start ?? 0,
              activeToken.end,
              speciesText,
            );

      return {
        type: "pokemon",
        value: speciesText,
        label: match.entry.name,
        applyText,
      } satisfies SuggestionOption;
    });
    const active = options[0]
      ? buildActiveSuggestion(
          "attacker_pokemon",
          query,
          options[0].value,
          options[0].applyText,
          input,
        )
      : null;

    return { activeSuggestion: active, suggestionOptions: options };
  }

  if (!structure.attacker.moveToken && attackerSpeciesLocked && attackerResolved) {
    const query = joinTokenValues(structure.attacker.leadingRemainderTokens);
    const options = getSuggestedMoves(attackerResolved.entry.id, query, 8).map((move) => {
      const token = formatMoveToken(move.name);
      return {
        type: "move",
        value: token,
        label: move.name,
        applyText:
          cursorIndex === input.length || !activeToken
            ? buildFullText(
                structure,
                buildAttackerSideTokens(structure, token, attackerReferenceToken),
                structure.lexed.hasDelimiter
                  ? structure.defender.rawTokens.map((token) => token.raw)
                  : undefined,
                structure.lexed.hasDelimiter,
              )
            : replaceLastToken(input, activeToken, token),
      } satisfies SuggestionOption;
    });
    const fragment = query || "";
    const active = options[0]
      ? buildActiveSuggestion(
          "attacker_move",
          fragment,
          options[0].value,
          options[0].applyText,
          input,
        )
      : null;

    return { activeSuggestion: active, suggestionOptions: options };
  }

  if (!structure.lexed.hasDelimiter) {
    const options: SuggestionOption[] = [
      withLabel({
        type: "separator",
        value: "x",
        applyText: appendToken(input, "x", true),
      }),
    ];

    if (attackerResolved) {
      options.push(
        ...getItemOptions(attackerResolved.entry.id, "", input),
        ...getAbilityOptions("attacker", attackerResolved.entry.id, "", input),
        ...getModifierOptions("attacker", "", input),
      );
    }

    return {
      activeSuggestion: buildActiveSuggestion(
        "separator",
        "",
        "x",
        options[0].applyText,
        input,
      ),
      suggestionOptions: dedupeOptions(options).slice(0, 8),
    };
  }

  if (!defenderSpeciesLocked) {
    const query = joinTokenValues(structure.defender.leadingFreeTokens);
    if (query.startsWith("#")) {
      const attackerTokens = structure.attacker.rawTokens.map((token) => token.raw);
      const matches = searchSetReferences(query, importedSets, 6);
      const options = matches.map(({ set, canonicalToken }) => ({
        type: "set" as const,
        value: canonicalToken,
        label: set.nickname
          ? `${set.nickname} · ${set.speciesName}`
          : set.speciesName,
        applyText:
          cursorIndex === input.length || !activeToken
            ? buildFullText(
                structure,
                attackerTokens,
                [
                  canonicalToken,
                  ...structure.defender.rawTokens
                    .slice(structure.defender.leadingFreeTokens.length)
                    .map((token) => token.raw),
                ].filter(Boolean),
                true,
              )
            : replaceRange(
                input,
                fullStructure.defender.rawTokens[0]?.start ??
                  (fullStructure.attacker.rawTokens.at(-1)?.end ?? 0),
                activeToken.end,
                canonicalToken,
              ),
      }));
      const active = options[0]
        ? buildActiveSuggestion(
            "defender_pokemon",
            query,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    const matches = searchPokemonEntities(query, 6);
    const attackerTokens = structure.attacker.rawTokens.map((token) => token.raw);
    const options = matches.map((match) => {
      const speciesText = formatSpeciesText(match.entry.name);

      return {
        type: "pokemon",
        value: speciesText,
        label: match.entry.name,
        applyText:
          cursorIndex === input.length || !activeToken
            ? buildFullText(
                structure,
                attackerTokens,
                [
                  speciesText,
                  ...structure.defender.rawTokens
                    .slice(structure.defender.leadingFreeTokens.length)
                    .map((token) => token.raw),
                ].filter(Boolean),
                true,
              )
            : replaceRange(
                input,
                fullStructure.defender.rawTokens[0]?.start ??
                  (fullStructure.attacker.rawTokens.at(-1)?.end ?? 0),
                activeToken.end,
                speciesText,
              ),
      } satisfies SuggestionOption;
    });
    const active = options[0]
      ? buildActiveSuggestion(
          "defender_pokemon",
          query,
          options[0].value,
          options[0].applyText,
          input,
        )
      : null;

    return { activeSuggestion: active, suggestionOptions: options };
  }

  if (!defenderExact) {
    return {
      activeSuggestion: null,
      suggestionOptions: [],
    };
  }

  const attackerTokens = structure.attacker.rawTokens.map((token) => token.raw);
  const defenderTokens = structure.defender.rawTokens.map((token) => token.raw);
  const baseInput = buildFullText(structure, attackerTokens, defenderTokens, true);
  const options = dedupeOptions([
    ...getItemOptions(defenderExact.entry.id, "", baseInput),
    ...getAbilityOptions("defender", defenderExact.entry.id, "", baseInput),
    ...getModifierOptions("defender", "", baseInput),
    ...getModifierOptions("global", "", baseInput),
  ]).slice(0, 8);

  return {
    activeSuggestion: null,
    suggestionOptions: options,
  };
}

export function getAutocompleteState(
  input: string,
  cursorIndex = input.length,
  importedSets: Record<string, ImportedSet> = {},
): AutocompleteResult {
  return getSlotSuggestions(input, cursorIndex, importedSets);
}

export function getInlineSuggestion(
  input: string,
  cursorIndex?: number,
  importedSets: Record<string, ImportedSet> = {},
) {
  const { activeSuggestion } = getSlotSuggestions(
    input,
    cursorIndex ?? input.length,
    importedSets,
  );
  return {
    ghostText: activeSuggestion?.ghostText ?? "",
    completionText: activeSuggestion?.completionText ?? null,
  };
}

export function getContextualMoveSuggestions(
  input: string,
  importedSets: Record<string, ImportedSet> = {},
) {
  const structure = analyzeCommandStructure(input);
  const attackerReferenceSet = resolveSetReferenceToken(
    structure.attacker.leadingFreeTokens[0]?.raw,
    importedSets,
  );
  const attacker =
    (attackerReferenceSet
      ? {
          entry:
            pokemonById.get(normalizeId(attackerReferenceSet.speciesId)) ?? null,
        }
      : null) ??
    structure.attacker.speciesExact ??
    resolveExactPokemonEntity(structure.attacker.speciesText);

  if (!attacker || !attacker.entry) {
    return [];
  }

  return getSuggestedMoves(attacker.entry.id, "", 6).map((move) => formatMoveToken(move.name));
}
