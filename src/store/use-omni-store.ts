import { create } from "zustand";

import { calculateDamageResults } from "@/lib/calc/damage-engine";
import {
  normalizeAlias,
  pokemonById,
  resolveMegaEvolution,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { parseCommand } from "@/lib/parser/command-parser";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  GLOBAL_MODIFIER_MAP,
  buildInitialChipState,
  buildCommonAbilities,
  formatAbilityToken,
  formatModifierToken,
  normalizeModifierValue,
  parseAbilitySymbol,
} from "@/lib/parser/grammar";
import {
  getAutoGlobalTokenForAbilityName,
  inferDefaultAbility,
} from "@/lib/parser/inference";
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
  highlightedSuggestionIndex: number;
  calculationReady: boolean;
  autoAppliedGlobalTokens: string[];
  autoGlobalContextKey: string | null;
  dismissedAutoGlobalContextKey: string | null;
  activeChipTokens: ActiveChipTokens;
  results: DamageResult[];
  issues: string[];
  setInput: (input: string) => void;
  moveSuggestionSelection: (delta: number) => void;
  applySuggestion: () => void;
  applySuggestionText: (nextInput: string) => void;
  insertChip: (scope: ChipScope, token: string) => void;
  setStatModifier: (scope: "attacker" | "defender", value: number) => void;
  setSpeedModifier: (scope: "attacker" | "defender", value: number) => void;
  setHpPercentage: (scope: "attacker" | "defender", value: number | null) => void;
  recompute: () => void;
}

const initialState = {
  input: "",
  parsed: null as ParsedCommand | null,
  activeSuggestion: null as SuggestionState | null,
  suggestionOptions: [] as SuggestionOption[],
  highlightedSuggestionIndex: -1,
  calculationReady: false,
  autoAppliedGlobalTokens: [] as string[],
  autoGlobalContextKey: null as string | null,
  dismissedAutoGlobalContextKey: null as string | null,
  activeChipTokens: buildInitialChipState(),
  results: [] as DamageResult[],
  issues: [] as string[],
};

type AutoFieldCategory = "weather" | "terrain";

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
) {
  if (segment.speciesExact) {
    return segment.speciesExact.entry;
  }

  if (segment.leadingRemainderTokens.length === 0) {
    return segment.speciesMatch?.entry ?? null;
  }

  return null;
}

function resolveScopedAbilityName(
  pokemonId: string | undefined,
  explicitAbility: string | undefined,
) {
  if (!pokemonId) {
    return explicitAbility;
  }

  if (explicitAbility) {
    const profile = vgcMetaByPokemonId.get(pokemonId);
    const pokemonAbilities = resolveParsedPokemonAbilities(pokemonId);
    const knownAbilities = buildCommonAbilities(profile, pokemonAbilities);
    const normalized = normalizeAlias(explicitAbility);

    return (
      knownAbilities.find((ability) => normalizeAlias(ability) === normalized) ??
      explicitAbility
    );
  }

  return inferDefaultAbility(pokemonId) ?? undefined;
}

function resolveParsedPokemonAbilities(pokemonId: string) {
  const profile = vgcMetaByPokemonId.get(pokemonId);
  const pokemon = pokemonById.get(pokemonId);
  const abilityPool = new Set<string>();

  for (const ability of pokemon?.abilities ?? []) {
    abilityPool.add(ability);
  }

  if (profile?.defaultAbility) {
    abilityPool.add(profile.defaultAbility);
  }

  for (const ability of profile?.commonAbilities ?? []) {
    abilityPool.add(ability);
  }

  return Array.from(abilityPool);
}

function getGlobalTokenCategory(token: string): AutoFieldCategory | null {
  const definition = GLOBAL_MODIFIER_MAP.get(token);

  if (!definition) {
    return null;
  }

  if (definition.section === "weather") {
    return "weather";
  }

  if (definition.section === "terrain") {
    return "terrain";
  }

  return null;
}

function stripAutoGlobalTokens(input: string, autoTokens: string[]) {
  if (!autoTokens.length) {
    return input;
  }

  const hadTrailingWhitespace = /\s$/.test(input);
  const structure = analyzeCommandStructure(input);
  const keepToken = (raw: string) => {
    const canonical = toCanonicalScopeToken("global", raw);
    return !canonical || !autoTokens.includes(canonical);
  };
  const attackerTokens = structure.attacker.rawTokens
    .filter((entry) => keepToken(entry.raw))
    .map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens
    .filter((entry) => keepToken(entry.raw))
    .map((entry) => entry.raw);
  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  const stripped = compactWhitespace(baseTokens.join(" "));
  return hadTrailingWhitespace && stripped ? `${stripped} ` : stripped;
}

function inputHasAllAutoTokens(input: string, autoTokens: string[]) {
  if (!autoTokens.length) {
    return false;
  }

  const activeGlobals = buildActiveChipTokens(input).global;
  return autoTokens.every((token) => activeGlobals.includes(token));
}

function deriveAutoGlobalState(input: string) {
  const structure = analyzeCommandStructure(input);
  const attacker = resolveParsedSpecies(structure.attacker);
  const defender = resolveParsedSpecies(structure.defender);

  if (!structure.lexed.hasDelimiter || !attacker || !defender) {
    return {
      key: null,
      tokens: [] as string[],
    };
  }

  const parsed = parseCommand(input).parsed;

  if (!parsed || !structure.attacker.speciesExact || !structure.defender.speciesExact) {
    return {
      key: null,
      tokens: [] as string[],
    };
  }

  const attackerResolved = attacker
    ? resolveMegaEvolution(attacker.id, structure.attacker.itemToken?.value) ?? attacker
    : null;
  const attackerAbility = resolveScopedAbilityName(
    attackerResolved?.id,
    structure.attacker.abilityToken?.value,
  );
  const defenderAbility = resolveScopedAbilityName(
    defender?.id,
    structure.defender.abilityToken?.value,
  );
  const attackerFinal = attackerResolved ?? attacker;
  const contextKey = [
    attackerFinal.id,
    normalizeAlias(attackerAbility ?? ""),
    defender.id,
    normalizeAlias(defenderAbility ?? ""),
  ].join("|");
  const candidates = [
    {
      token: getAutoGlobalTokenForAbilityName(attackerAbility),
      speed: attackerFinal.baseStats.spe,
    },
    {
      token: getAutoGlobalTokenForAbilityName(defenderAbility),
      speed: defender.baseStats.spe,
    },
  ]
    .map((candidate) => {
      if (!candidate.token) {
        return null;
      }

      const category = getGlobalTokenCategory(candidate.token);
      if (!category) {
        return null;
      }

      return {
        ...candidate,
        category,
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        token: string;
        speed: number;
        category: AutoFieldCategory;
      } => Boolean(candidate),
    );
  const desiredByCategory = new Map<AutoFieldCategory, typeof candidates>();

  for (const candidate of candidates) {
    const existing = desiredByCategory.get(candidate.category) ?? [];
    existing.push(candidate);
    desiredByCategory.set(candidate.category, existing);
  }

  const manualGlobalTokens = new Set(
    structure.globalTokens.map((token) => token.value),
  );
  const nextAutoTokens: string[] = [];

  for (const [category, entries] of desiredByCategory.entries()) {
    const hasManualCategoryToken = Array.from(manualGlobalTokens).some((token) => {
      return getGlobalTokenCategory(token) === category;
    });

    if (hasManualCategoryToken) {
      continue;
    }

    const uniqueTokens = Array.from(new Set(entries.map((entry) => entry.token)));

    if (uniqueTokens.length === 1) {
      nextAutoTokens.push(formatModifierToken("global", uniqueTokens[0]));
      continue;
    }

    const sorted = [...entries].sort((left, right) => left.speed - right.speed);
    const [slowest, secondSlowest] = sorted;

    if (!slowest || (secondSlowest && secondSlowest.speed === slowest.speed)) {
      continue;
    }

    nextAutoTokens.push(formatModifierToken("global", slowest.token));
  }

  return {
    key: contextKey,
    tokens: nextAutoTokens,
  };
}

function applyAutoGlobalTokens(
  input: string,
  previousAutoTokens: string[],
  previousContextKey: string | null,
  previousDismissedContextKey: string | null,
) {
  const hadPreviousAutoTokens = inputHasAllAutoTokens(input, previousAutoTokens);
  const strippedInput = stripAutoGlobalTokens(input, previousAutoTokens);
  const autoState = deriveAutoGlobalState(strippedInput);
  let dismissedContextKey = previousDismissedContextKey;

  if (!autoState.key) {
    dismissedContextKey = null;
  } else if (
    previousAutoTokens.length &&
    !hadPreviousAutoTokens &&
    previousContextKey === autoState.key
  ) {
    dismissedContextKey = autoState.key;
  } else if (dismissedContextKey && dismissedContextKey !== autoState.key) {
    dismissedContextKey = null;
  }

  const shouldKeepExistingAuto =
    hadPreviousAutoTokens &&
    previousContextKey !== null &&
    previousContextKey === autoState.key;
  const shouldAutoApplyNew =
    Boolean(autoState.key) &&
    previousContextKey !== autoState.key &&
    dismissedContextKey !== autoState.key;

  if (!autoState.tokens.length || (!shouldKeepExistingAuto && !shouldAutoApplyNew)) {
    return {
      input: strippedInput,
      autoAppliedGlobalTokens: [],
      autoGlobalContextKey: autoState.key,
      dismissedAutoGlobalContextKey: dismissedContextKey,
    };
  }

  const structure = analyzeCommandStructure(strippedInput);
  const attackerTokens = structure.attacker.rawTokens.map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens.map((entry) => entry.raw);
  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  return {
    input: compactWhitespace([...baseTokens, ...autoState.tokens].join(" ")),
    autoAppliedGlobalTokens: autoState.tokens,
    autoGlobalContextKey: autoState.key,
    dismissedAutoGlobalContextKey: dismissedContextKey,
  };
}

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
    return removeChipToken(normalizedInput, scope, token);
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

function toCanonicalScopeToken(scope: ChipScope, raw: string) {
  if (scope !== "global" && /^%\d{1,3}$/i.test(raw)) {
    return raw;
  }

  const ability = parseAbilitySymbol(raw);
  if (ability && scope !== "global" && ability.scope === scope) {
    return formatAbilityToken(scope, ability.ability);
  }

  if (scope === "attacker" && (raw.startsWith(">") || raw.toLowerCase().startsWith("a:"))) {
    const value = normalizeModifierValue(
      raw.startsWith(">") ? raw.slice(1) : raw.slice(2),
    );
    return formatModifierToken("attacker", value);
  }

  if (scope === "defender" && (raw.startsWith("<") || raw.toLowerCase().startsWith("d:"))) {
    const value = normalizeModifierValue(
      raw.startsWith("<") ? raw.slice(1) : raw.slice(2),
    );
    return formatModifierToken("defender", value);
  }

  if (scope === "global" && (raw.startsWith("~") || raw.toLowerCase().startsWith("g:"))) {
    const value = normalizeModifierValue(
      raw.startsWith("~") ? raw.slice(1) : raw.slice(2),
    );
    return formatModifierToken("global", value);
  }

  return null;
}

function removeChipToken(input: string, scope: ChipScope, token: string) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = structure.attacker.rawTokens
    .filter((entry) => toCanonicalScopeToken("attacker", entry.raw) !== token)
    .map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens
    .filter((entry) => toCanonicalScopeToken("defender", entry.raw) !== token)
    .map((entry) => entry.raw);
  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  if (scope === "global") {
    return baseTokens
      .filter((entry) => toCanonicalScopeToken("global", entry) !== token)
      .join(" ")
      .trim();
  }

  return baseTokens.join(" ").trim();
}

function stripModifierTokensByKind(
  scope: "attacker" | "defender",
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
  kind: "stat_mod" | "speed_mod",
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

    return definition?.kind !== kind;
  });
}

function setScopedStageToken(
  input: string,
  scope: "attacker" | "defender",
  value: number,
  kind: "stat_mod" | "speed_mod",
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripModifierTokensByKind("attacker", structure.attacker.rawTokens, kind)
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripModifierTokensByKind("defender", structure.defender.rawTokens, kind)
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);
  const token =
    value === 0
      ? null
      : formatModifierToken(
          scope,
          kind === "speed_mod" ? (value > 0 ? `spe+${value}` : `spe${value}`) : value > 0 ? `+${value}` : `${value}`,
        );

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

function setStatModifierToken(input: string, scope: "attacker" | "defender", value: number) {
  return setScopedStageToken(input, scope, value, "stat_mod");
}

function setSpeedModifierToken(input: string, scope: "attacker" | "defender", value: number) {
  return setScopedStageToken(input, scope, value, "speed_mod");
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

function computeState(
  input: string,
  previousAutoTokens: string[] = [],
  previousContextKey: string | null = null,
  previousDismissedContextKey: string | null = null,
) {
  const normalizedInput = input.replace(/\s+$/g, (match) => match);
  const withAutoTokens = applyAutoGlobalTokens(
    normalizedInput,
    previousAutoTokens,
    previousContextKey,
    previousDismissedContextKey,
  );
  const parsedResult = parseCommand(withAutoTokens.input);
  const autocomplete = getAutocompleteState(withAutoTokens.input);

  return {
    input: withAutoTokens.input,
    parsed: parsedResult.parsed,
    activeSuggestion: autocomplete.activeSuggestion,
    suggestionOptions: autocomplete.suggestionOptions,
    highlightedSuggestionIndex: autocomplete.suggestionOptions.length ? 0 : -1,
    calculationReady: Boolean(parsedResult.parsed),
    autoAppliedGlobalTokens: withAutoTokens.autoAppliedGlobalTokens,
    autoGlobalContextKey: withAutoTokens.autoGlobalContextKey,
    dismissedAutoGlobalContextKey: withAutoTokens.dismissedAutoGlobalContextKey,
    activeChipTokens: buildActiveChipTokens(withAutoTokens.input),
    issues: parsedResult.issues,
    results: parsedResult.parsed ? calculateDamageResults(parsedResult.parsed) : [],
  };
}

export const useOmniStore = create<OmniStore>((set, get) => ({
  ...initialState,
  setInput: (input) =>
    set(
      computeState(
        input,
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    ),
  moveSuggestionSelection: (delta) => {
    const options = get().suggestionOptions;
    if (!options.length) {
      return;
    }

    const currentIndex = get().highlightedSuggestionIndex;
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + delta + options.length) % options.length;

    set({ highlightedSuggestionIndex: nextIndex });
  },
  applySuggestion: () => {
    const options = get().suggestionOptions;
    const highlightedIndex = get().highlightedSuggestionIndex;
    const highlightedOption =
      highlightedIndex >= 0 && highlightedIndex < options.length
        ? options[highlightedIndex]
        : null;

    if (highlightedOption) {
      set(
        computeState(
          highlightedOption.applyText,
          get().autoAppliedGlobalTokens,
          get().autoGlobalContextKey,
          get().dismissedAutoGlobalContextKey,
        ),
      );
      return;
    }

    const suggestion = get().activeSuggestion;
    if (!suggestion) {
      return;
    }

    set(
      computeState(
        suggestion.completionText,
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    );
  },
  applySuggestionText: (nextInput) =>
    set(
      computeState(
        nextInput,
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    ),
  insertChip: (scope, token) => {
    set(
      computeState(
        insertChipToken(get().input, scope, token),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    );
  },
  setStatModifier: (scope, value) => {
    set(
      computeState(
        setStatModifierToken(get().input, scope, value),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    );
  },
  setSpeedModifier: (scope, value) => {
    set(
      computeState(
        setSpeedModifierToken(get().input, scope, value),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    );
  },
  setHpPercentage: (scope, value) => {
    set(
      computeState(
        setHpPercentageToken(get().input, scope, value),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    );
  },
  recompute: () =>
    set(
      computeState(
        get().input,
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
      ),
    ),
}));

export function resetOmniStore() {
  useOmniStore.setState(initialState);
}
