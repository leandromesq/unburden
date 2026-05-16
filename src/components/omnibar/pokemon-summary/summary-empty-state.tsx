"use client";

import type { ImportedSet } from "@/lib/types";

import { useI18n } from "@/i18n/I18nProvider";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { SummaryHeader } from "@/components/omnibar/pokemon-summary/summary-header";
import { SummarySavedSetList } from "@/components/omnibar/pokemon-summary/summary-saved-set-list";

interface SummaryEmptyStateProps {
  side: "attacker" | "defender";
  hasImportedSets: boolean;
  importedSetList: ImportedSet[];
  speciesInput: string;
  speciesOptions: string[];
  onSelectSet: (speciesId: string) => void;
  onRemoveSet: (speciesId: string) => void;
  onInputSpecies: (value: string) => void;
  onCommitSpecies: (value: string) => void;
  onOpenImport: () => void;
}

export function SummaryEmptyState({
  side,
  hasImportedSets,
  importedSetList,
  speciesInput,
  speciesOptions,
  onSelectSet,
  onRemoveSet,
  onInputSpecies,
  onCommitSpecies,
  onOpenImport,
}: SummaryEmptyStateProps) {
  const { dictionary } = useI18n();
  const sideLabel =
    side === "attacker"
      ? dictionary.modifierSwitches.attacker
      : dictionary.modifierSwitches.defender;

  return (
    <aside
      data-testid={`${side}-summary`}
      className="theme-panel min-w-0 overflow-visible rounded-xl p-4 sm:p-5"
    >
      <SummaryHeader title={sideLabel} />

      <div className="mt-3 flex min-w-0 items-start gap-3 sm:items-center">
        <div className="theme-subpanel flex h-18 w-18 shrink-0 items-center justify-center rounded-xl p-2 sm:h-20 sm:w-20">
          <div className="theme-text-faint font-mono text-xs">
            —
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-medium">{sideLabel}</div>
          <div className="theme-text-dim mt-1 text-sm">
            {dictionary.summary.resolvePokemon}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <SearchableCombobox
          label="Pokemon"
          hideLabel
          compact
          name="pokemon-species"
          value={speciesInput}
          options={speciesOptions}
          placeholder="Pokemon"
          onChange={onInputSpecies}
          onInputChange={onInputSpecies}
          onSelectOption={onCommitSpecies}
          onBlur={onCommitSpecies}
        />
      </div>

      {hasImportedSets ? (
        <>
          <button
            type="button"
            onClick={onOpenImport}
            className="theme-control mt-4 w-full rounded-lg py-2.5 text-sm"
          >
            {dictionary.summary.import}
          </button>
          <SummarySavedSetList
            sets={importedSetList}
            onSelectSet={(set) => onSelectSet(set.speciesId)}
            onRemoveSet={onRemoveSet}
          />
        </>
      ) : (
        <>
          <div className="theme-text-dim mt-3 text-sm">
            {dictionary.summary.resolveQuickSummary(sideLabel)}
          </div>
          <button
            type="button"
            onClick={onOpenImport}
            className="theme-control mt-4 w-full rounded-lg py-2.5 text-sm"
          >
            {dictionary.summary.import}
          </button>
        </>
      )}
    </aside>
  );
}
