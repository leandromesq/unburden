import {
  calculateDamageResults,
  getCalculationIssues,
} from "@/lib/calc/damage-engine";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { parseCommand } from "@/lib/parser/command-parser";
import { getAutocompleteState } from "@/lib/parser/inline-suggestions";
import { buildActiveChipTokens } from "@/lib/parser/input-mutations";
import { prioritizeRecommendedGlobals } from "@/lib/omni/auto-global-tokens";
import type {
  ActiveChipTokens,
  DamageResult,
  ImportedSet,
  ParsedCommand,
  SuggestionOption,
  SuggestionState,
} from "@/lib/types";

interface ComputeStateInput {
  input: string;
  importedSets: Record<string, ImportedSet>;
  previousAutoTokens?: string[];
  previousContextKey?: string | null;
  previousDismissedContextKey?: string | null;
  cursorIndex?: number;
  strictMode?: boolean;
  includeResults?: boolean;
  applyAutoGlobalTokens: (
    input: string,
    importedSets: Record<string, ImportedSet>,
    previousAutoTokens?: string[],
    previousContextKey?: string | null,
    previousDismissedContextKey?: string | null,
  ) => {
    input: string;
    autoAppliedGlobalTokens: string[];
    autoGlobalContextKey: string | null;
    dismissedAutoGlobalContextKey: string | null;
  };
}

interface ComputedOmniState {
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
  issues: string[];
}

export function computeOmniState({
  input,
  importedSets,
  previousAutoTokens = [],
  previousContextKey = null,
  previousDismissedContextKey = null,
  cursorIndex = input.length,
  strictMode = false,
  includeResults = true,
  applyAutoGlobalTokens,
}: ComputeStateInput): ComputedOmniState {
  const normalizedInput = input.replace(/\s+$/g, (match) => match);
  const withAutoTokens = applyAutoGlobalTokens(
    normalizedInput,
    importedSets,
    previousAutoTokens,
    previousContextKey,
    previousDismissedContextKey,
  );

  const commandStructure = analyzeCommandStructure(withAutoTokens.input);
  const parsedResult = parseCommand(withAutoTokens.input, importedSets);
  const calculationIssues = parsedResult.parsed
    ? getCalculationIssues(parsedResult.parsed, importedSets, { strictMode })
    : [];
  const issues = Array.from(
    new Set([...parsedResult.issues, ...calculationIssues]),
  );
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
  const parsedCommand = parsedResult.parsed;
  const canCalculate = Boolean(parsedCommand) && calculationIssues.length === 0;

  return {
    input: withAutoTokens.input,
    cursorIndex: nextCursorIndex,
    strictMode,
    commandStructure,
    parsed: parsedCommand,
    activeSuggestion: autocomplete.activeSuggestion,
    suggestionOptions,
    highlightedSuggestionIndex: suggestionOptions.length ? 0 : -1,
    calculationReady: includeResults ? canCalculate : false,
    autoAppliedGlobalTokens: withAutoTokens.autoAppliedGlobalTokens,
    autoGlobalContextKey: withAutoTokens.autoGlobalContextKey,
    dismissedAutoGlobalContextKey: withAutoTokens.dismissedAutoGlobalContextKey,
    activeChipTokens: buildActiveChipTokens(commandStructure),
    issues,
    results:
      includeResults && canCalculate && parsedCommand
        ? calculateDamageResults(parsedCommand, importedSets, { strictMode })
        : [],
  };
}
