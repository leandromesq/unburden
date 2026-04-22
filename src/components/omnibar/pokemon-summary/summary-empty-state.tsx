"use client";

import type { ImportedSet } from "@/lib/types";

import { useI18n } from "@/i18n/I18nProvider";
import { SummarySavedSetList } from "@/components/omnibar/pokemon-summary/summary-saved-set-list";

interface SummaryEmptyStateProps {
  side: "attacker" | "defender";
  hasImportedSets: boolean;
  importedSetList: ImportedSet[];
  onSelectSet: (speciesId: string) => void;
  onRemoveSet: (speciesId: string) => void;
  onOpenImport: () => void;
}

export function SummaryEmptyState({
  side,
  hasImportedSets,
  importedSetList,
  onSelectSet,
  onRemoveSet,
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
      className="theme-panel rounded-[28px] p-5"
    >
      <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
        {sideLabel}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="theme-subpanel-strong flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
          <div className="theme-text-faint font-mono text-xs uppercase tracking-[0.2em]">
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

      {hasImportedSets ? (
        <SummarySavedSetList
          sets={importedSetList}
          onSelectSet={(set) => onSelectSet(set.speciesId)}
          onRemoveSet={onRemoveSet}
          onImportClick={onOpenImport}
        />
      ) : (
        <>
          <div className="theme-text-dim mt-3 text-sm">
            {dictionary.summary.resolveQuickSummary(sideLabel)}
          </div>
          <button
            type="button"
            onClick={onOpenImport}
            className="theme-chip mt-4 w-full rounded-2xl py-2.5 text-xs"
          >
            {dictionary.summary.import}
          </button>
        </>
      )}
    </aside>
  );
}
