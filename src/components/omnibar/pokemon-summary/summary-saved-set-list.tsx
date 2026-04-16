import type { ImportedSet } from "@/lib/types";

interface SummarySavedSetListProps {
  sets: ImportedSet[];
  onSelectSet: (set: ImportedSet) => void;
  onRemoveSet: (speciesId: string) => void;
  importButtonLabel?: string;
  onImportClick: () => void;
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
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className="theme-subpanel w-full rounded-2xl px-3 py-2.5 pr-8 text-left transition-colors"
      >
        <div className="text-xs font-medium">
          {set.nickname ?? set.speciesName}
        </div>
        {set.nickname ? (
          <div className="theme-text-faint mt-0.5 truncate text-[10px]">
            {set.speciesName}
          </div>
        ) : null}
        {(set.item || set.ability) && (
          <div className="theme-text-faint mt-0.5 truncate text-[10px]">
            {[set.item, set.ability].filter(Boolean).join(" · ")}
          </div>
        )}
      </button>
      <button
        type="button"
        aria-label={`Remove ${set.speciesName}`}
        onClick={onRemove}
        className="theme-icon-button absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-sm opacity-0 transition-opacity group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export function SummarySavedSetList({
  sets,
  onSelectSet,
  onRemoveSet,
  importButtonLabel = "Import / Edit Team",
  onImportClick,
}: SummarySavedSetListProps) {
  if (sets.length === 0) {
    return null;
  }

  return (
    <>
      <div className="theme-text-dim mt-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
        Saved Sets
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
      <button
        type="button"
        onClick={onImportClick}
        className="theme-chip mt-2 w-full rounded-2xl py-2 text-xs"
      >
        {importButtonLabel}
      </button>
    </>
  );
}
