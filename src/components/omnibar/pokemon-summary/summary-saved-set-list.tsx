import { X } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import type { ImportedSet } from "@/lib/types";

interface SummarySavedSetListProps {
  sets: ImportedSet[];
  onSelectSet: (set: ImportedSet) => void;
  onRemoveSet: (speciesId: string) => void;
  importButtonLabel?: string;
  onImportClick?: () => void;
}

function SavedSetListItem({
  set,
  onSelect,
  onRemove,
}: {
  set: ImportedSet;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { dictionary } = useI18n();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className="theme-subpanel w-full rounded-lg px-3 py-2.5 pr-12 text-left transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-3)] focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
      >
        <div className="text-xs font-medium">
          {set.nickname ?? set.speciesName}
        </div>
        {set.nickname ? (
          <div className="theme-text-faint mt-0.5 truncate text-[11px]">
            {set.speciesName}
          </div>
        ) : null}
        {(set.item || set.ability) && (
          <div className="theme-text-faint mt-0.5 truncate text-[11px]">
            {[set.item, set.ability].filter(Boolean).join(" · ")}
          </div>
        )}
      </button>
      <button
        type="button"
        aria-label={dictionary.summary.removeSet(set.speciesName)}
        onClick={onRemove}
        className="theme-icon-button absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-sm"
      >
        <X aria-hidden="true" size={12} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function SummarySavedSetList({
  sets,
  onSelectSet,
  onRemoveSet,
  importButtonLabel,
  onImportClick,
}: SummarySavedSetListProps) {
  const { dictionary } = useI18n();

  if (sets.length === 0) {
    return null;
  }

  return (
    <>
      <div className="theme-text-dim mt-4 mb-2 text-sm font-medium">
        {dictionary.summary.savedSets}
      </div>
      <div className="space-y-1.5">
        {sets.map((set) => (
          <SavedSetListItem
            key={set.speciesId}
            set={set}
            onSelect={() => onSelectSet(set)}
            onRemove={() => onRemoveSet(set.speciesId)}
          />
        ))}
      </div>
      {onImportClick ? (
        <button
          type="button"
          onClick={onImportClick}
          className="theme-control mt-2 w-full rounded-lg py-2 text-sm"
        >
          {importButtonLabel ?? dictionary.summary.import}
        </button>
      ) : null}
    </>
  );
}
