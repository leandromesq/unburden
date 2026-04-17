import { normalizeAlias } from "@/lib/data/loaders";
import {
  ATTACKER_CHIP_DEFINITIONS,
  DEFENDER_CHIP_DEFINITIONS,
  GLOBAL_CHIP_DEFINITIONS,
  formatAbilityToken,
  formatModifierToken,
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import {
  getSuggestedAbilities,
  getSuggestedItems,
} from "@/lib/parser/inference";
import {
  compactWhitespace,
  joinTokenValues,
  type LexToken,
} from "@/lib/parser/tokenize";
import type { SuggestionOption, SuggestionState } from "@/lib/types";
import type { CommandStructure } from "@/lib/parser/resolvers/types";

export function replaceLastTokenWithCursor(
  input: string,
  token: LexToken,
  replacement: string,
): [text: string, cursorOffset: number] {
  const beforeToken = input.slice(0, token.start);
  const afterToken = input.slice(token.end);
  const preCompact = `${beforeToken}${replacement}${afterToken}`;
  const postCompact = compactWhitespace(preCompact);

  const cursorOffset = beforeToken.length + replacement.length;
  return [postCompact, cursorOffset];
}

export function appendTokenWithCursor(
  input: string,
  token: string,
  addTrailingSpace = false,
): [text: string, cursorOffset: number] {
  const base = input.trimEnd();
  const next = base ? `${base} ${token}` : token;
  const final = addTrailingSpace ? `${next} ` : next;

  const cursorOffset = next.length;
  return [final, cursorOffset];
}

export function replaceRangeWithCursor(
  input: string,
  start: number,
  end: number,
  replacement: string,
): [text: string, cursorOffset: number] {
  const beforeRange = input.slice(0, start);
  const afterRange = input.slice(end);
  const preCompact = `${beforeRange}${replacement}${afterRange}`;
  const postCompact = compactWhitespace(preCompact);

  const cursorOffset = beforeRange.length + replacement.length;
  return [postCompact, cursorOffset];
}

export function formatSpeciesText(name: string) {
  const normalized = normalizeAlias(name);

  if (/-mega/i.test(name)) {
    return normalized.replace(/\s+/g, "-");
  }

  return normalized;
}

export function formatMoveToken(moveId: string) {
  return `!${slugifySymbolValue(moveId)}`;
}

export function splitMoveFragment(raw: string) {
  const value = raw.toLowerCase().startsWith("m:") ? raw.slice(2) : raw.slice(1);
  const hitSuffixMatch = value.match(/\(\d*\)?$/);
  const hitSuffix = hitSuffixMatch?.[0] ?? "";

  return {
    moveFragment: hitSuffix ? value.slice(0, -hitSuffix.length) : value,
    hitSuffix,
  };
}

export function formatItemToken(itemName: string) {
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

export function withLabel(
  option: Omit<SuggestionOption, "label">,
): SuggestionOption {
  return {
    ...option,
    label: option.value,
  };
}

export function dedupeOptions(options: SuggestionOption[]) {
  return options.filter(
    (option, index, collection) =>
      collection.findIndex((entry) => entry.applyText === option.applyText) ===
      index,
  );
}

export function buildAttackerSideTokens(
  structure: CommandStructure,
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

  return [attackerSpecies, moveToken, ...explicitTokens].filter(
    Boolean,
  ) as string[];
}

export function buildFullText(
  structure: CommandStructure,
  attackerTokens: string[],
  defenderTokens?: string[],
  forceDelimiter?: boolean,
) {
  if (
    forceDelimiter ||
    structure.lexed.hasDelimiter ||
    (defenderTokens && defenderTokens.length)
  ) {
    return [...attackerTokens, "x", ...(defenderTokens ?? [])].join(" ").trim();
  }

  return attackerTokens.join(" ").trim();
}

export function buildActiveSuggestion(
  slot: SuggestionState["slot"],
  fragment: string,
  candidate: string,
  completionText: string,
  currentInput: string,
) {
  const ghostText = getGhostSuffix(fragment, candidate);
  if (
    !ghostText &&
    compactWhitespace(completionText) === compactWhitespace(currentInput)
  ) {
    return null;
  }

  return {
    slot,
    ghostText,
    completionText,
  } satisfies SuggestionState;
}

export function getModifierOptions(
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
  const labelQuery =
    normalizedQuery.includes("+") || normalizedQuery.includes("-")
      ? normalizedQuery
      : normalizedQuery.replace(/-/g, " ");
  const matches = catalog.filter((definition) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      definition.token.startsWith(normalizedQuery) ||
      definition.label.toLowerCase().includes(labelQuery)
    );
  });

  const stagePriorityByValue = new Map<number, number>([
    [1, 0],
    [-1, 1],
    [2, 2],
    [-2, 3],
  ]);

  const rankedMatches = matches
    .map((definition, index) => ({ definition, index }))
    .sort((left, right) => {
      const leftStatMod =
        left.definition.kind === "stat_mod" ||
        left.definition.kind === "speed_mod"
          ? left.definition.statMod
          : null;
      const rightStatMod =
        right.definition.kind === "stat_mod" ||
        right.definition.kind === "speed_mod"
          ? right.definition.statMod
          : null;

      if (leftStatMod !== null && rightStatMod !== null) {
        const l = leftStatMod ?? 0;
        const r = rightStatMod ?? 0;
        const leftKindBias = left.definition.kind === "stat_mod" ? 0 : 100;
        const rightKindBias = right.definition.kind === "stat_mod" ? 0 : 100;
        const leftPriority =
          leftKindBias +
          (stagePriorityByValue.get(l) ??
            (10 + Math.abs(l) * 2 + (l > 0 ? 0 : 1)));
        const rightPriority =
          rightKindBias +
          (stagePriorityByValue.get(r) ??
            (10 + Math.abs(r) * 2 + (r > 0 ? 0 : 1)));

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return left.index - right.index;
      }

      if (leftStatMod !== null) {
        return -1;
      }

      if (rightStatMod !== null) {
        return 1;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.definition);

  return rankedMatches.slice(0, 8).map((definition) => {
    const token = formatModifierToken(scope, definition.token);
    const [applyText, cursorOffset] = lastToken
      ? replaceLastTokenWithCursor(input, lastToken, token)
      : appendTokenWithCursor(input, token);

    return withLabel({
      type: "modifier",
      value: token,
      applyText,
      cursorOffset,
    });
  });
}

export function getAbilityOptions(
  scope: "attacker" | "defender",
  pokemonId: string,
  query: string,
  input: string,
  lastToken?: LexToken,
) {
  return getSuggestedAbilities(pokemonId, query, 6).map((ability) => {
    const token = formatAbilityToken(scope, ability);
    const [applyText, cursorOffset] = lastToken
      ? replaceLastTokenWithCursor(input, lastToken, token)
      : appendTokenWithCursor(input, token);

    return {
      type: "ability",
      value: token,
      label: ability,
      applyText,
      cursorOffset,
    } satisfies SuggestionOption;
  });
}

export function getItemOptions(
  pokemonId: string,
  query: string,
  input: string,
  lastToken?: LexToken,
) {
  return getSuggestedItems(pokemonId, query, 6).map((itemName) => {
    const token = formatItemToken(itemName);
    const [applyText, cursorOffset] = lastToken
      ? replaceLastTokenWithCursor(input, lastToken, token)
      : appendTokenWithCursor(input, token);

    return {
      type: "item",
      value: token,
      label: itemName,
      applyText,
      cursorOffset,
    } satisfies SuggestionOption;
  });
}
