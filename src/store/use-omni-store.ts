import { create } from "zustand";

import { calculateDamageResults } from "@/lib/calc/damage-engine";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { parseCommand } from "@/lib/parser/command-parser";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  buildInitialChipState,
  formatAbilityToken,
  formatModifierToken,
  normalizeModifierValue,
} from "@/lib/parser/grammar";
import { getAutocompleteState } from "@/lib/parser/inline-suggestions";
import { compactWhitespace, joinTokenValues } from "@/lib/parser/tokenize";
import type {
  ActiveChipTokens,
  DamageResult,
  ParsedCommand,
  SuggestionOption,
  SuggestionState,
} from "@/lib/types";

type ChipScope = keyof ActiveChipTokens;

interface OmniStore {
  input: string;
  parsed: ParsedCommand | null;
  activeSuggestion: SuggestionState | null;
  suggestionOptions: SuggestionOption[];
  calculationReady: boolean;
  activeChipTokens: ActiveChipTokens;
  results: DamageResult[];
  issues: string[];
  setInput: (input: string) => void;
  applySuggestion: () => void;
  applySuggestionText: (nextInput: string) => void;
  insertChip: (scope: ChipScope, token: string) => void;
  setStatModifier: (scope: "attacker" | "defender", value: number) => void;
  setHpPercentage: (scope: "attacker" | "defender", value: number | null) => void;
  recompute: () => void;
}

const initialState = {
  input: "",
  parsed: null as ParsedCommand | null,
  activeSuggestion: null as SuggestionState | null,
  suggestionOptions: [] as SuggestionOption[],
  calculationReady: false,
  activeChipTokens: buildInitialChipState(),
  results: [] as DamageResult[],
  issues: [] as string[],
};

function buildActiveChipTokens(input: string): ActiveChipTokens {
  const structure = analyzeCommandStructure(input);

  return {
    attacker: [
      ...structure.attacker.modifierTokens.map((token) =>
        formatModifierToken("attacker", token.value),
      ),
      ...(structure.attacker.hpToken ? [`%${structure.attacker.hpToken.value}`] : []),
      ...(structure.attacker.abilityToken
        ? [formatAbilityToken("attacker", structure.attacker.abilityToken.value)]
        : []),
    ],
    defender: [
      ...structure.defender.modifierTokens.map((token) =>
        formatModifierToken("defender", token.value),
      ),
      ...(structure.defender.hpToken ? [`%${structure.defender.hpToken.value}`] : []),
      ...(structure.defender.abilityToken
        ? [formatAbilityToken("defender", structure.defender.abilityToken.value)]
        : []),
    ],
    global: structure.globalTokens.map((token) =>
      formatModifierToken("global", token.value),
    ),
  };
}

function insertChipToken(input: string, scope: ChipScope, token: string) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const activeChips = buildActiveChipTokens(normalizedInput);

  if (activeChips[scope].includes(token)) {
    return normalizedInput;
  }

  const attackerTokens = structure.attacker.rawTokens.map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens.map((entry) => entry.raw);

  if (scope === "attacker") {
    if (structure.lexed.hasDelimiter) {
      return [...attackerTokens, token, "x", ...defenderTokens].join(" ").trim();
    }

    return [...attackerTokens, token].join(" ").trim();
  }

  if (scope === "defender") {
    if (!structure.lexed.hasDelimiter || !joinTokenValues(structure.defender.speciesTokens)) {
      return normalizedInput;
    }

    return [...attackerTokens, "x", ...defenderTokens, token].join(" ").trim();
  }

  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  return [...baseTokens, token].join(" ").trim();
}

function stripStatModifierTokens(
  scope: "attacker" | "defender",
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  const modifierMap = scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;

  return tokens.filter((entry) => {
    const raw = entry.raw;
    const isScopedToken =
      scope === "attacker"
        ? raw.toLowerCase().startsWith("a:") || raw.startsWith(">")
        : raw.toLowerCase().startsWith("d:") || raw.startsWith("<");

    if (!isScopedToken) {
      return true;
    }

    const value = normalizeModifierValue(
      scope === "attacker"
        ? raw.toLowerCase().startsWith("a:")
          ? raw.slice(2)
          : raw.slice(1)
        : raw.toLowerCase().startsWith("d:")
          ? raw.slice(2)
          : raw.slice(1),
    );
    const definition = value ? modifierMap.get(value) : undefined;

    return definition?.kind !== "stat_mod";
  });
}

function setStatModifierToken(input: string, scope: "attacker" | "defender", value: number) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripStatModifierTokens("attacker", structure.attacker.rawTokens)
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripStatModifierTokens("defender", structure.defender.rawTokens)
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);
  const token = value === 0 ? null : formatModifierToken(scope, value > 0 ? `+${value}` : `${value}`);

  if (scope === "attacker") {
    const nextAttackerTokens = token ? [...attackerTokens, token] : attackerTokens;
    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (!structure.lexed.hasDelimiter || !joinTokenValues(structure.defender.speciesTokens)) {
    return normalizedInput;
  }

  const nextDefenderTokens = token ? [...defenderTokens, token] : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function stripHpTokens(tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"]) {
  return tokens.filter((entry) => !/^%\d{1,3}$/i.test(entry.raw));
}

function setHpPercentageToken(input: string, scope: "attacker" | "defender", value: number | null) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker" ? stripHpTokens(structure.attacker.rawTokens) : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender" ? stripHpTokens(structure.defender.rawTokens) : structure.defender.rawTokens
  ).map((entry) => entry.raw);
  const token = value === null ? null : `%${Math.max(1, Math.min(100, value))}`;

  if (scope === "attacker") {
    const nextAttackerTokens = token ? [...attackerTokens, token] : attackerTokens;
    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (!structure.lexed.hasDelimiter || !joinTokenValues(structure.defender.speciesTokens)) {
    return normalizedInput;
  }

  const nextDefenderTokens = token ? [...defenderTokens, token] : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function computeState(input: string) {
  const normalizedInput = input.replace(/\s+$/g, (match) => match);
  const parsedResult = parseCommand(normalizedInput);
  const autocomplete = getAutocompleteState(normalizedInput);

  return {
    input: normalizedInput,
    parsed: parsedResult.parsed,
    activeSuggestion: autocomplete.activeSuggestion,
    suggestionOptions: autocomplete.suggestionOptions,
    calculationReady: Boolean(parsedResult.parsed),
    activeChipTokens: buildActiveChipTokens(normalizedInput),
    issues: parsedResult.issues,
    results: parsedResult.parsed ? calculateDamageResults(parsedResult.parsed) : [],
  };
}

export const useOmniStore = create<OmniStore>((set, get) => ({
  ...initialState,
  setInput: (input) => set(computeState(input)),
  applySuggestion: () => {
    const suggestion = get().activeSuggestion;
    if (!suggestion) {
      return;
    }

    set(computeState(suggestion.completionText));
  },
  applySuggestionText: (nextInput) => set(computeState(nextInput)),
  insertChip: (scope, token) => {
    set(computeState(insertChipToken(get().input, scope, token)));
  },
  setStatModifier: (scope, value) => {
    set(computeState(setStatModifierToken(get().input, scope, value)));
  },
  setHpPercentage: (scope, value) => {
    set(computeState(setHpPercentageToken(get().input, scope, value)));
  },
  recompute: () => set(computeState(get().input)),
}));

export function resetOmniStore() {
  useOmniStore.setState(initialState);
}
