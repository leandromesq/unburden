import { create } from "zustand";

import { calculateDamageResults, getCalculationIssues } from "@/lib/calc/damage-engine";
import {
  normalizeAlias,
  pokemonById,
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
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import {
  getAutoGlobalTokenForAbilityName,
  inferDefaultAbility,
} from "@/lib/parser/inference";
import { getAutocompleteState } from "@/lib/parser/inline-suggestions";
import { compactWhitespace, joinTokenValues } from "@/lib/parser/tokenize";
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import type {
  ActiveChipTokens,
  DamageResult,
  ImportedSet,
  ParsedCommand,
  SuggestionOption,
  SuggestionState,
} from "@/lib/types";
import { useTeamStore } from "@/store/use-team-store";

type ChipScope = keyof ActiveChipTokens;

interface OmniStore {
  input: string;
  cursorIndex: number;
  strictMode: boolean;
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
  setInput: (input: string, cursorIndex?: number) => void;
  setCursorIndex: (cursorIndex: number) => void;
  moveSuggestionSelection: (delta: number) => void;
  applySuggestion: () => void;
  applySuggestionText: (nextInput: string) => void;
  insertChip: (scope: ChipScope, token: string) => void;
  setStatModifier: (scope: "attacker" | "defender", value: number) => void;
  setSpeedModifier: (scope: "attacker" | "defender", value: number) => void;
  setHpPercentage: (
    scope: "attacker" | "defender",
    value: number | null,
  ) => void;
  setStrictMode: (strictMode: boolean) => void;
  recompute: () => void;
  setAttackerMove: (moveName: string) => void;
}

const initialState = {
  input: "",
  cursorIndex: 0,
  strictMode: false,
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

let scheduledComputeFrame: number | null = null;
let scheduledComputeVersion = 0;

function cancelScheduledCompute() {
  if (
    scheduledComputeFrame !== null &&
    typeof window !== "undefined" &&
    typeof window.cancelAnimationFrame === "function"
  ) {
    window.cancelAnimationFrame(scheduledComputeFrame);
  }

  scheduledComputeFrame = null;
}

type AutoFieldCategory = "weather" | "terrain";

function isLegacyScopedToken(raw: string) {
  return /^(?:[adg]:|>|<)/i.test(raw);
}

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  importedSets: Record<string, ImportedSet>,
) {
  const referenceSet = resolveSetReferenceToken(
    segment.leadingFreeTokens[0]?.raw,
    importedSets,
  );

  if (referenceSet && segment.leadingFreeTokens.length === 1) {
    return pokemonById.get(referenceSet.speciesId) ?? null;
  }

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
      knownAbilities.find(
        (ability) => normalizeAlias(ability) === normalized,
      ) ?? explicitAbility
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

function deriveAutoGlobalState(input: string) {
  const structure = analyzeCommandStructure(input);
  const importedSets = useTeamStore.getState().importedSets;
  const attacker = resolveParsedSpecies(structure.attacker, importedSets);
  const defender = resolveParsedSpecies(structure.defender, importedSets);

  if (!structure.lexed.hasDelimiter || !attacker || !defender) {
    return {
      key: null,
      tokens: [] as string[],
    };
  }

  const parsed = parseCommand(input, importedSets).parsed;

  if (
    !parsed ||
    !structure.attacker.speciesExact ||
    !structure.defender.speciesExact
  ) {
    return {
      key: null,
      tokens: [] as string[],
    };
  }

  const attackerAbility = resolveScopedAbilityName(
    attacker?.id,
    structure.attacker.abilityToken?.value,
  );
  const defenderAbility = resolveScopedAbilityName(
    defender?.id,
    structure.defender.abilityToken?.value,
  );
  const contextKey = [
    attacker.id,
    normalizeAlias(attackerAbility ?? ""),
    defender.id,
    normalizeAlias(defenderAbility ?? ""),
  ].join("|");
  const candidates = [
    {
      token: getAutoGlobalTokenForAbilityName(attackerAbility),
      speed: attacker.baseStats.spe,
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
    const hasManualCategoryToken = Array.from(manualGlobalTokens).some(
      (token) => {
        return getGlobalTokenCategory(token) === category;
      },
    );

    if (hasManualCategoryToken) {
      continue;
    }

    const uniqueTokens = Array.from(
      new Set(entries.map((entry) => entry.token)),
    );

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
  _previousAutoTokens: string[],
  _previousContextKey: string | null,
  _previousDismissedContextKey: string | null,
) {
  void _previousAutoTokens;
  void _previousContextKey;
  void _previousDismissedContextKey;

  const autoState = deriveAutoGlobalState(input);
  return {
    input,
    autoAppliedGlobalTokens: autoState.tokens,
    autoGlobalContextKey: autoState.key,
    dismissedAutoGlobalContextKey: null,
  };
}

function buildRecommendedGlobalOptions(
  input: string,
  recommendedTokens: string[],
): SuggestionOption[] {
  const baseInput = input.trimEnd();

  return recommendedTokens.map((token) => ({
    type: "modifier",
    value: token,
    label: token,
    applyText: baseInput ? `${baseInput} ${token}` : token,
  }));
}

function prioritizeRecommendedGlobals(
  input: string,
  options: SuggestionOption[],
  recommendedTokens: string[],
) {
  if (!recommendedTokens.length || !options.length) {
    return recommendedTokens.length
      ? buildRecommendedGlobalOptions(input, recommendedTokens)
      : options;
  }

  const recommendedSet = new Set(recommendedTokens);
  const synthesized = buildRecommendedGlobalOptions(input, recommendedTokens).filter(
    (option) => !options.some((existing) => existing.value === option.value),
  );
  const prioritized = options.filter((option) => recommendedSet.has(option.value));
  const remaining = options.filter((option) => !recommendedSet.has(option.value));

  return [...synthesized, ...prioritized, ...remaining];
}

function buildActiveChipTokens(input: string): ActiveChipTokens {
  const structure = analyzeCommandStructure(input);

  return {
    attacker: [
      ...structure.attacker.modifierTokens.map((token) =>
        formatModifierToken("attacker", token.value),
      ),
      ...(structure.attacker.hpToken
        ? [`%${structure.attacker.hpToken.value}`]
        : []),
      ...(structure.attacker.abilityToken
        ? [
            formatAbilityToken(
              "attacker",
              structure.attacker.abilityToken.value,
            ),
          ]
        : []),
    ],
    defender: [
      ...structure.defender.modifierTokens.map((token) =>
        formatModifierToken("defender", token.value),
      ),
      ...(structure.defender.hpToken
        ? [`%${structure.defender.hpToken.value}`]
        : []),
      ...(structure.defender.abilityToken
        ? [
            formatAbilityToken(
              "defender",
              structure.defender.abilityToken.value,
            ),
          ]
        : []),
    ],
    global: structure.globalTokens.map((token) =>
      formatModifierToken("global", token.value),
    ),
  };
}

function insertChipToken(input: string, scope: ChipScope, token: string) {
  let normalizedInput = compactWhitespace(input);
  const activeChips = buildActiveChipTokens(normalizedInput);

  if (activeChips[scope].includes(token)) {
    return removeChipToken(normalizedInput, scope, token);
  }

  if (scope === "global") {
    const rawValue = token.startsWith("~")
      ? token.slice(1)
      : token.toLowerCase().startsWith("g:")
        ? token.slice(2)
        : token;
    const definition = GLOBAL_MODIFIER_MAP.get(
      normalizeModifierValue(rawValue),
    );
    if (
      definition?.section === "weather" ||
      definition?.section === "terrain"
    ) {
      normalizedInput = stripGlobalSectionTokens(
        normalizedInput,
        definition.section,
      );
    }
  }

  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = structure.attacker.rawTokens.map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens.map((entry) => entry.raw);

  if (scope === "attacker") {
    if (structure.lexed.hasDelimiter) {
      return [...attackerTokens, token, "x", ...defenderTokens]
        .join(" ")
        .trim();
    }

    return [...attackerTokens, token].join(" ").trim();
  }

  if (scope === "defender") {
    if (
      !structure.lexed.hasDelimiter ||
      !joinTokenValues(structure.defender.speciesTokens)
    ) {
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
  if (isLegacyScopedToken(raw)) {
    return null;
  }

  if (scope !== "global" && /^%\d{1,3}$/i.test(raw)) {
    return raw;
  }

  const ability = parseAbilitySymbol(
    raw,
    scope === "global" ? undefined : scope,
  );
  if (ability && scope !== "global" && ability.scope === scope) {
    return formatAbilityToken(scope, ability.ability);
  }

  const normalizedValue =
    scope === "global" && raw.startsWith("~")
      ? normalizeModifierValue(raw.slice(1))
      : normalizeModifierValue(raw);

  if (scope === "attacker" && ATTACKER_MODIFIER_MAP.has(normalizedValue)) {
    return formatModifierToken("attacker", normalizedValue);
  }

  if (scope === "defender" && DEFENDER_MODIFIER_MAP.has(normalizedValue)) {
    return formatModifierToken("defender", normalizedValue);
  }

  if (scope === "global" && GLOBAL_MODIFIER_MAP.has(normalizedValue)) {
    return formatModifierToken("global", normalizedValue);
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

function stripGlobalSectionTokens(
  input: string,
  section: "weather" | "terrain",
): string {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = structure.attacker.rawTokens.map((entry) => entry.raw);
  const defenderTokens = structure.defender.rawTokens.map((entry) => entry.raw);
  const baseTokens = structure.lexed.hasDelimiter
    ? [...attackerTokens, "x", ...defenderTokens]
    : attackerTokens;

  return baseTokens
    .filter((raw) => {
      const canonical = toCanonicalScopeToken("global", raw);
      if (canonical === null) return true;
      const tokenValue = canonical.slice(1); // strip leading "~"
      const definition = GLOBAL_MODIFIER_MAP.get(tokenValue);
      return definition?.section !== section;
    })
    .join(" ")
    .trim();
}

function stripModifierTokensByKind(
  scope: "attacker" | "defender",
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
  kind: "stat_mod" | "speed_mod",
) {
  const modifierMap =
    scope === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP;

  return tokens.filter((entry) => {
    const raw = entry.raw;
    if (isLegacyScopedToken(raw)) {
      return false;
    }

    const value = normalizeModifierValue(raw);
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
      ? stripModifierTokensByKind(
          "attacker",
          structure.attacker.rawTokens,
          kind,
        )
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripModifierTokensByKind(
          "defender",
          structure.defender.rawTokens,
          kind,
        )
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);
  const token =
    value === 0
      ? null
      : formatModifierToken(
          scope,
          kind === "speed_mod"
            ? value > 0
              ? `spe+${value}`
              : `spe${value}`
            : value > 0
              ? `+${value}`
              : `${value}`,
        );

  if (scope === "attacker") {
    const nextAttackerTokens = token
      ? [...attackerTokens, token]
      : attackerTokens;
    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token
    ? [...defenderTokens, token]
    : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function setStatModifierToken(
  input: string,
  scope: "attacker" | "defender",
  value: number,
) {
  return setScopedStageToken(input, scope, value, "stat_mod");
}

function setSpeedModifierToken(
  input: string,
  scope: "attacker" | "defender",
  value: number,
) {
  return setScopedStageToken(input, scope, value, "speed_mod");
}

function stripHpTokens(
  tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
) {
  return tokens.filter((entry) => !/^%\d{1,3}$/i.test(entry.raw));
}

function setHpPercentageToken(
  input: string,
  scope: "attacker" | "defender",
  value: number | null,
) {
  const normalizedInput = compactWhitespace(input);
  const structure = analyzeCommandStructure(normalizedInput);
  const attackerTokens = (
    scope === "attacker"
      ? stripHpTokens(structure.attacker.rawTokens)
      : structure.attacker.rawTokens
  ).map((entry) => entry.raw);
  const defenderTokens = (
    scope === "defender"
      ? stripHpTokens(structure.defender.rawTokens)
      : structure.defender.rawTokens
  ).map((entry) => entry.raw);
  const token = value === null ? null : `%${Math.max(1, Math.min(100, value))}`;

  if (scope === "attacker") {
    const nextAttackerTokens = token
      ? [...attackerTokens, token]
      : attackerTokens;
    if (structure.lexed.hasDelimiter) {
      return [...nextAttackerTokens, "x", ...defenderTokens].join(" ").trim();
    }

    return nextAttackerTokens.join(" ").trim();
  }

  if (
    !structure.lexed.hasDelimiter ||
    !joinTokenValues(structure.defender.speciesTokens)
  ) {
    return normalizedInput;
  }

  const nextDefenderTokens = token
    ? [...defenderTokens, token]
    : defenderTokens;
  return [...attackerTokens, "x", ...nextDefenderTokens].join(" ").trim();
}

function computeState(
  input: string,
  previousAutoTokens: string[] = [],
  previousContextKey: string | null = null,
  previousDismissedContextKey: string | null = null,
  cursorIndex = input.length,
  strictMode = false,
) {
  const normalizedInput = input.replace(/\s+$/g, (match) => match);
  const importedSets = useTeamStore.getState().importedSets;
  const withAutoTokens = applyAutoGlobalTokens(
    normalizedInput,
    previousAutoTokens,
    previousContextKey,
    previousDismissedContextKey,
  );
  const parsedResult = parseCommand(withAutoTokens.input, importedSets);
  const calculationIssues = parsedResult.parsed
    ? getCalculationIssues(parsedResult.parsed, importedSets, { strictMode })
    : [];
  const issues = Array.from(new Set([...parsedResult.issues, ...calculationIssues]));
  const nextCursorIndex = Math.min(cursorIndex, withAutoTokens.input.length);
  const autocomplete = getAutocompleteState(
    withAutoTokens.input,
    nextCursorIndex,
    importedSets,
  );
  const suggestionOptions = prioritizeRecommendedGlobals(
    withAutoTokens.input,
    autocomplete.suggestionOptions,
    withAutoTokens.autoAppliedGlobalTokens,
  );

  return {
    input: withAutoTokens.input,
    cursorIndex: nextCursorIndex,
    strictMode,
    parsed: parsedResult.parsed,
    activeSuggestion: autocomplete.activeSuggestion,
    suggestionOptions,
    highlightedSuggestionIndex: suggestionOptions.length ? 0 : -1,
    calculationReady: Boolean(parsedResult.parsed) && calculationIssues.length === 0,
    autoAppliedGlobalTokens: withAutoTokens.autoAppliedGlobalTokens,
    autoGlobalContextKey: withAutoTokens.autoGlobalContextKey,
    dismissedAutoGlobalContextKey: withAutoTokens.dismissedAutoGlobalContextKey,
    activeChipTokens: buildActiveChipTokens(withAutoTokens.input),
    issues,
    results: parsedResult.parsed && calculationIssues.length === 0
      ? calculateDamageResults(
          parsedResult.parsed,
          importedSets,
          { strictMode },
        )
      : [],
  };
}

export const useOmniStore = create<OmniStore>((set, get) => ({
  ...initialState,
  setInput: (input, cursorIndex) => {
    const nextCursorIndex = cursorIndex ?? input.length;

    set({
      input,
      cursorIndex: nextCursorIndex,
    });

    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV === "test" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      set(
        computeState(
          input,
          get().autoAppliedGlobalTokens,
          get().autoGlobalContextKey,
          get().dismissedAutoGlobalContextKey,
          nextCursorIndex,
          get().strictMode,
        ),
      );
      return;
    }

    const version = ++scheduledComputeVersion;
    cancelScheduledCompute();
    scheduledComputeFrame = window.requestAnimationFrame(() => {
      scheduledComputeFrame = null;

      if (version !== scheduledComputeVersion) {
        return;
      }

      const state = get();
      set(
        computeState(
          state.input,
          state.autoAppliedGlobalTokens,
          state.autoGlobalContextKey,
          state.dismissedAutoGlobalContextKey,
          state.cursorIndex,
          state.strictMode,
        ),
      );
    });
  },
  setCursorIndex: (cursorIndex) => {
    set({ cursorIndex });

    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV === "test" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      set(
        computeState(
          get().input,
          get().autoAppliedGlobalTokens,
          get().autoGlobalContextKey,
          get().dismissedAutoGlobalContextKey,
          cursorIndex,
          get().strictMode,
        ),
      );
      return;
    }

    const version = ++scheduledComputeVersion;
    cancelScheduledCompute();
    scheduledComputeFrame = window.requestAnimationFrame(() => {
      scheduledComputeFrame = null;

      if (version !== scheduledComputeVersion) {
        return;
      }

      const state = get();
      set(
        computeState(
          state.input,
          state.autoAppliedGlobalTokens,
          state.autoGlobalContextKey,
          state.dismissedAutoGlobalContextKey,
          state.cursorIndex,
          state.strictMode,
        ),
      );
    });
  },
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
    cancelScheduledCompute();
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
          undefined,
          get().strictMode,
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
        undefined,
        get().strictMode,
      ),
    );
  },
  applySuggestionText: (nextInput) =>
    {
      cancelScheduledCompute();
      set(
        computeState(
          nextInput,
          get().autoAppliedGlobalTokens,
          get().autoGlobalContextKey,
          get().dismissedAutoGlobalContextKey,
          undefined,
          get().strictMode,
        ),
      );
    },
  insertChip: (scope, token) => {
    cancelScheduledCompute();
    set(
      computeState(
        insertChipToken(get().input, scope, token),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
        undefined,
        get().strictMode,
      ),
    );
  },
  setStatModifier: (scope, value) => {
    cancelScheduledCompute();
    set(
      computeState(
        setStatModifierToken(get().input, scope, value),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
        undefined,
        get().strictMode,
      ),
    );
  },
  setSpeedModifier: (scope, value) => {
    cancelScheduledCompute();
    set(
      computeState(
        setSpeedModifierToken(get().input, scope, value),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
        undefined,
        get().strictMode,
      ),
    );
  },
  setHpPercentage: (scope, value) => {
    cancelScheduledCompute();
    set(
      computeState(
        setHpPercentageToken(get().input, scope, value),
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
        undefined,
        get().strictMode,
      ),
    );
  },
  setStrictMode: (strictMode) =>
    {
      cancelScheduledCompute();
      set(
        computeState(
          get().input,
          get().autoAppliedGlobalTokens,
          get().autoGlobalContextKey,
          get().dismissedAutoGlobalContextKey,
          get().cursorIndex,
          strictMode,
        ),
      );
    },
  recompute: () =>
    {
      cancelScheduledCompute();
      set(
        computeState(
          get().input,
          get().autoAppliedGlobalTokens,
          get().autoGlobalContextKey,
          get().dismissedAutoGlobalContextKey,
          undefined,
          get().strictMode,
        ),
      );
    },
  setAttackerMove: (moveName) => {
    cancelScheduledCompute();
    const currentInput = compactWhitespace(get().input);
    const structure = analyzeCommandStructure(currentInput);

    // Remove any existing move token from attacker tokens
    const attackerTokens = structure.attacker.rawTokens
      .filter((t) => {
        const n = t.normalized;
        return !n.startsWith("m:") && !n.startsWith("!");
      })
      .map((t) => t.raw);

    // Append the new move token (slugified)
    const moveSlug = slugifySymbolValue(moveName);
    const newAttackerTokens = [...attackerTokens, `!${moveSlug}`];

    let newInput: string;
    if (structure.lexed.hasDelimiter) {
      const defenderTokens = structure.defender.rawTokens.map((t) => t.raw);
      newInput = [...newAttackerTokens, "x", ...defenderTokens]
        .join(" ")
        .trim();
    } else {
      newInput = newAttackerTokens.join(" ").trim();
    }

    set(
      computeState(
        newInput,
        get().autoAppliedGlobalTokens,
        get().autoGlobalContextKey,
        get().dismissedAutoGlobalContextKey,
        undefined,
        get().strictMode,
      ),
    );
  },
}));

export function resetOmniStore() {
  cancelScheduledCompute();
  useOmniStore.setState(initialState);
}
