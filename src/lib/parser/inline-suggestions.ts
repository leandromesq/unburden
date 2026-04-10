import {
  itemDisplayById,
  normalizeAlias,
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
  getSuggestedMoves,
  inferDefaultItem,
} from "@/lib/parser/inference";
import { compactWhitespace, joinTokenValues, type LexToken } from "@/lib/parser/tokenize";
import type { SuggestionOption, SuggestionState } from "@/lib/types";

interface AutocompleteResult {
  activeSuggestion: SuggestionState | null;
  suggestionOptions: SuggestionOption[];
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

function buildAttackerSideTokens(
  structure: ReturnType<typeof analyzeCommandStructure>,
  moveToken?: string,
) {
  const attackerSpecies = structure.attacker.speciesExact
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
  attackerId: string,
  query: string,
  input: string,
  lastToken?: LexToken,
) {
  const metaItem = inferDefaultItem(attackerId);
  const normalizedQuery = slugifySymbolValue(query);
  const pool = Array.from(itemDisplayById.values()).filter((itemName) => {
    if (metaItem && itemName === metaItem) {
      return true;
    }

    if (!normalizedQuery) {
      return false;
    }

    return slugifySymbolValue(itemName).startsWith(normalizedQuery);
  });
  const ordered = metaItem
    ? [metaItem, ...pool.filter((itemName) => itemName !== metaItem)]
    : pool;

  return ordered.slice(0, 6).map((itemName) => {
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

function getSlotSuggestions(input: string): AutocompleteResult {
  const structure = analyzeCommandStructure(input);
  const lastToken = structure.lexed.tokens.at(-1);
  const trailingWhitespace = structure.lexed.trailingWhitespace;
  const attackerExact = structure.attacker.speciesExact;
  const attackerResolved = attackerExact ?? structure.attacker.speciesMatch;
  const defenderExact = structure.defender.speciesExact;

  if (!trailingWhitespace && lastToken) {
    const raw = lastToken.raw;

    if ((raw.toLowerCase().startsWith("m:") || raw.startsWith("!")) && attackerResolved) {
      const query = raw.toLowerCase().startsWith("m:") ? raw.slice(2) : raw.slice(1);
      const options = getSuggestedMoves(attackerResolved.entry.id, query, 8).map((move) => {
        const token = formatMoveToken(move.name);
        return {
          type: "move",
          value: token,
          label: move.name,
          applyText: replaceLastToken(input, lastToken, token),
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

    if (raw.toLowerCase().startsWith("a:[") || raw.startsWith(">[")) {
      const query = (
        raw.toLowerCase().startsWith("a:[") ? raw.slice(3) : raw.slice(2)
      ).replace(/\]$/g, "");
      const options = attackerResolved
        ? getAbilityOptions("attacker", attackerResolved.entry.id, query, input, lastToken)
        : [];
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

    if (raw.toLowerCase().startsWith("d:[") || raw.startsWith("<[")) {
      const query = (
        raw.toLowerCase().startsWith("d:[") ? raw.slice(3) : raw.slice(2)
      ).replace(/\]$/g, "");
      const options = defenderExact
        ? getAbilityOptions("defender", defenderExact.entry.id, query, input, lastToken)
        : [];
      const active = options[0]
        ? buildActiveSuggestion(
            "defender_modifier_or_ability",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    if (raw.toLowerCase().startsWith("a:") || raw.startsWith(">")) {
      const options = getModifierOptions(
        "attacker",
        raw.toLowerCase().startsWith("a:") ? raw.slice(2) : raw.slice(1),
        input,
        lastToken,
      );
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

    if (raw.toLowerCase().startsWith("d:") || raw.startsWith("<")) {
      const options = getModifierOptions(
        "defender",
        raw.toLowerCase().startsWith("d:") ? raw.slice(2) : raw.slice(1),
        input,
        lastToken,
      );
      const active = options[0]
        ? buildActiveSuggestion(
            "defender_modifier_or_ability",
            raw,
            options[0].value,
            options[0].applyText,
            input,
          )
        : null;

      return { activeSuggestion: active, suggestionOptions: options };
    }

    if (raw.toLowerCase().startsWith("g:") || raw.startsWith("~")) {
      const options = getModifierOptions(
        "global",
        raw.toLowerCase().startsWith("g:") ? raw.slice(2) : raw.slice(1),
        input,
        lastToken,
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

    if (raw.startsWith("@") && attackerResolved) {
      const options = getItemOptions(attackerResolved.entry.id, raw.slice(1), input, lastToken);
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
  }

  if (!attackerExact) {
    const query = joinTokenValues(structure.attacker.leadingFreeTokens);
    const matches = searchPokemonEntities(query, 6);
    const options = matches.map((match) => {
      const speciesText = formatSpeciesText(match.entry.name);
      const suffixTokens = structure.attacker.rawTokens
        .slice(structure.attacker.leadingFreeTokens.length)
        .map((token) => token.raw);
      const applyText = compactWhitespace([speciesText, ...suffixTokens].join(" "));

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
          input,
          options[0].value,
          options[0].applyText,
          input,
        )
      : null;

    return { activeSuggestion: active, suggestionOptions: options };
  }

  if (!structure.attacker.moveToken && attackerResolved) {
    const query = joinTokenValues(structure.attacker.leadingRemainderTokens);
    const options = getSuggestedMoves(attackerResolved.entry.id, query, 8).map((move) => {
      const token = formatMoveToken(move.name);
      const attackerTokens = buildAttackerSideTokens(structure, token);
      const defenderTokens = structure.lexed.hasDelimiter
        ? structure.defender.rawTokens.map((token) => token.raw)
        : undefined;

      return {
        type: "move",
        value: token,
        label: move.name,
        applyText: buildFullText(
          structure,
          attackerTokens,
          defenderTokens,
          structure.lexed.hasDelimiter,
        ),
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

  if (!defenderExact) {
    const query = joinTokenValues(structure.defender.leadingFreeTokens);
    const matches = searchPokemonEntities(query, 6);
    const attackerTokens = structure.attacker.rawTokens.map((token) => token.raw);
    const options = matches.map((match) => {
      const speciesText = formatSpeciesText(match.entry.name);
      const suffixTokens = structure.defender.rawTokens
        .slice(structure.defender.leadingFreeTokens.length)
        .map((token) => token.raw);

      return {
        type: "pokemon",
        value: speciesText,
        label: match.entry.name,
        applyText: buildFullText(
          structure,
          attackerTokens,
          [speciesText, ...suffixTokens].filter(Boolean),
          true,
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

  const attackerTokens = structure.attacker.rawTokens.map((token) => token.raw);
  const defenderTokens = structure.defender.rawTokens.map((token) => token.raw);
  const baseInput = buildFullText(structure, attackerTokens, defenderTokens, true);
  const options = dedupeOptions([
    ...getModifierOptions("defender", "", baseInput),
    ...getModifierOptions("global", "", baseInput),
    ...getAbilityOptions("defender", defenderExact.entry.id, "", baseInput),
  ]).slice(0, 8);

  return {
    activeSuggestion: null,
    suggestionOptions: options,
  };
}

export function getAutocompleteState(input: string): AutocompleteResult {
  return getSlotSuggestions(input);
}

export function getInlineSuggestion(input: string) {
  const { activeSuggestion } = getAutocompleteState(input);
  return {
    ghostText: activeSuggestion?.ghostText ?? "",
    completionText: activeSuggestion?.completionText ?? null,
  };
}

export function getContextualMoveSuggestions(input: string) {
  const structure = analyzeCommandStructure(input);
  const attacker = structure.attacker.speciesExact ?? resolveExactPokemonEntity(structure.attacker.speciesText);

  if (!attacker) {
    return [];
  }

  return getSuggestedMoves(attacker.entry.id, "", 6).map((move) => formatMoveToken(move.name));
}
