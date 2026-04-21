import { create } from "zustand";

import { calculateDamageResults } from "@/lib/calc/damage-engine";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  buildInitialChipState,
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import {
  insertChipToken,
  setHpPercentageToken,
  setSpeedModifierToken,
  setStatModifierToken,
  type ChipScope,
} from "@/lib/parser/input-mutations";
import { compactWhitespace } from "@/lib/parser/tokenize";
import { applyAutoGlobalTokens } from "@/lib/omni/auto-global-tokens";
import { computeOmniState } from "@/lib/omni/compute-state";
import type {
  ActiveChipTokens,
  DamageResult,
  OmniIssue,
  ParsedCommand,
  SuggestionOption,
  SuggestionState,
} from "@/lib/types";
import { omniScheduler } from "@/store/omni-scheduler";
import { useTeamStore } from "@/store/use-team-store";

interface OmniStore {
  input: string;
  cursorIndex: number;
  strictMode: boolean;
  commandStructure: ReturnType<typeof analyzeCommandStructure>;
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
  issues: OmniIssue[];
  setInput: (input: string, cursorIndex?: number) => void;
  setInputImmediately: (input: string, cursorIndex?: number) => void;
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
  commandStructure: analyzeCommandStructure(""),
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
  issues: [] as OmniIssue[],
};

const TYPING_PREVIEW_DEBOUNCE_MS = 72;

export const useOmniStore = create<OmniStore>((set, get) => {
  const commitState = (
    nextInput: string,
    nextCursorIndex: number,
    nextStrictMode: boolean,
    options?: { debounceMs?: number; syncPreview?: boolean },
  ) => {
    const currentState = get();

    if (
      currentState.input === nextInput &&
      currentState.cursorIndex === nextCursorIndex &&
      currentState.strictMode === nextStrictMode
    ) {
      return;
    }

    const importedSets = useTeamStore.getState().importedSets;

    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV === "test" ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      set(
        computeOmniState({
          input: nextInput,
          importedSets,
          previousAutoTokens: currentState.autoAppliedGlobalTokens,
          previousContextKey: currentState.autoGlobalContextKey,
          previousDismissedContextKey:
            currentState.dismissedAutoGlobalContextKey,
          cursorIndex: nextCursorIndex,
          strictMode: nextStrictMode,
          applyAutoGlobalTokens,
        }),
      );
      return;
    }

    const applyPreviewState = (
      stateSnapshot: typeof currentState,
      input: string,
      cursorIndex: number,
      strictMode: boolean,
    ) => {
      const previewState = computeOmniState({
        input,
        importedSets: useTeamStore.getState().importedSets,
        previousAutoTokens: stateSnapshot.autoAppliedGlobalTokens,
        previousContextKey: stateSnapshot.autoGlobalContextKey,
        previousDismissedContextKey: stateSnapshot.dismissedAutoGlobalContextKey,
        cursorIndex,
        strictMode,
        includeResults: false,
        applyAutoGlobalTokens,
      });
      const previewParsed = previewState.parsed;
      const keepPreviousResults =
        Boolean(previewParsed) &&
        previewState.issues.length === 0 &&
        stateSnapshot.calculationReady &&
        stateSnapshot.results.length > 0;

      set({
        ...previewState,
        calculationReady: keepPreviousResults
          ? stateSnapshot.calculationReady
          : previewState.calculationReady,
        results: keepPreviousResults ? stateSnapshot.results : previewState.results,
      });

      return previewState;
    };

    const scheduleResultCalculation = (
      version: number,
      parsed: ParsedCommand,
      strictMode: boolean,
    ) => {
      omniScheduler.scheduleCalculation(version, () => {
        const results = calculateDamageResults(
          parsed,
          useTeamStore.getState().importedSets,
          { strictMode },
        );

        if (version !== omniScheduler.getVersion()) {
          return;
        }

        set({
          results,
          calculationReady: true,
        });
      });
    };

    if (options?.syncPreview) {
      omniScheduler.cancelPreview();

      const version = omniScheduler.bumpVersion();
      const previewState = applyPreviewState(
        currentState,
        nextInput,
        nextCursorIndex,
        nextStrictMode,
      );

      if (!previewState.parsed || previewState.issues.length > 0) {
        return;
      }

      scheduleResultCalculation(
        version,
        previewState.parsed,
        previewState.strictMode,
      );
      return;
    }

    set({
      input: nextInput,
      cursorIndex: nextCursorIndex,
      strictMode: nextStrictMode,
    });

    const version = omniScheduler.bumpVersion();

    omniScheduler.schedulePreview(
      version,
      () => {
        const state = get();
        const previewState = applyPreviewState(
          state,
          state.input,
          state.cursorIndex,
          state.strictMode,
        );
        const previewParsed = previewState.parsed;

        if (!previewParsed || previewState.issues.length > 0) {
          return;
        }

        scheduleResultCalculation(
          version,
          previewParsed,
          previewState.strictMode,
        );
      },
      options?.debounceMs ?? 0,
    );
  };

  return {
    ...initialState,
    setInput: (input, cursorIndex) => {
      const nextCursorIndex = cursorIndex ?? input.length;
      commitState(input, nextCursorIndex, get().strictMode, {
        debounceMs: TYPING_PREVIEW_DEBOUNCE_MS,
      });
    },
    setInputImmediately: (input, cursorIndex) => {
      const nextCursorIndex = cursorIndex ?? input.length;
      commitState(input, nextCursorIndex, get().strictMode, {
        syncPreview: true,
      });
    },
    setCursorIndex: (cursorIndex) => {
      commitState(get().input, cursorIndex, get().strictMode, {
        debounceMs: TYPING_PREVIEW_DEBOUNCE_MS,
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
      const options = get().suggestionOptions;
      const highlightedIndex = get().highlightedSuggestionIndex;
      const highlightedOption =
        highlightedIndex >= 0 && highlightedIndex < options.length
          ? options[highlightedIndex]
          : null;

      if (highlightedOption) {
        const cursorIndex =
          highlightedOption.cursorOffset ?? highlightedOption.applyText.length;
        commitState(highlightedOption.applyText, cursorIndex, get().strictMode);
        return;
      }

      const suggestion = get().activeSuggestion;
      if (!suggestion) {
        return;
      }

      commitState(
        suggestion.completionText,
        suggestion.completionText.length,
        get().strictMode,
      );
    },
    applySuggestionText: (nextInput) => {
      commitState(nextInput, nextInput.length, get().strictMode);
    },
    insertChip: (scope, token) => {
      const nextInput = insertChipToken(get().input, scope, token);
      commitState(nextInput, nextInput.length, get().strictMode);
    },
    setStatModifier: (scope, value) => {
      const nextInput = setStatModifierToken(get().input, scope, value);
      commitState(nextInput, nextInput.length, get().strictMode);
    },
    setSpeedModifier: (scope, value) => {
      const nextInput = setSpeedModifierToken(get().input, scope, value);
      commitState(nextInput, nextInput.length, get().strictMode);
    },
    setHpPercentage: (scope, value) => {
      const nextInput = setHpPercentageToken(get().input, scope, value);
      commitState(nextInput, nextInput.length, get().strictMode);
    },
    setStrictMode: (strictMode) => {
      commitState(get().input, get().cursorIndex, strictMode);
    },
    recompute: () => {
      commitState(get().input, get().cursorIndex, get().strictMode);
    },
    setAttackerMove: (moveName) => {
      const currentInput = compactWhitespace(get().input);
      const structure = analyzeCommandStructure(currentInput);

      const attackerTokens = structure.attacker.rawTokens
        .filter((t) => {
          const n = t.normalized;
          return !n.startsWith("m:") && !n.startsWith("!");
        })
        .map((t) => t.raw);

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

      commitState(newInput, newInput.length, get().strictMode);
    },
  };
});

export function resetOmniStore() {
  omniScheduler.reset();
  useOmniStore.setState(initialState);
}
