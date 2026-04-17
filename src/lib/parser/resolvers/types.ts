import type { LexToken } from "@/lib/parser/tokenize";
import type {
  ImportedSet,
  PokemonEntry,
  SuggestionOption,
  SuggestionState,
} from "@/lib/types";

export interface AutocompleteResult {
  activeSuggestion: SuggestionState | null;
  suggestionOptions: SuggestionOption[];
}

export type CommandStructure = ReturnType<
  typeof import("@/lib/parser/command-structure").analyzeCommandStructure
>;

export interface SuggestionContext {
  input: string;
  cursorIndex: number;
  importedSets: Record<string, ImportedSet>;
  fullStructure: CommandStructure;
  structure: CommandStructure;
  activeToken: LexToken | null;
  raw: string | null;
  trailingWhitespace: boolean;
  attackerReferenceToken: string | null;
  attackerResolved: { entry: PokemonEntry } | null;
  attackerSpeciesLocked: boolean;
  defenderExact: { entry: PokemonEntry } | null;
  defenderSpeciesLocked: boolean;
  activeTokenInAttacker: boolean;
  activeTokenInDefender: boolean;
  activeTokenInAttackerSpecies: boolean;
  activeTokenInDefenderSpecies: boolean;
}

export type SlotResolver = (
  context: SuggestionContext,
) => AutocompleteResult | null;
