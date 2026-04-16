import type { ImportedSet } from "@/lib/types";

interface SummarySetActionsProps {
  importedSet: ImportedSet | null;
  otherSets: ImportedSet[];
  switchOpen: boolean;
  switchRef: React.RefObject<HTMLDivElement | null>;
  onToggleSwitch: () => void;
  onSelectSet: (set: ImportedSet) => void;
  onSave: () => void;
  onEdit: () => void;
  onImport: () => void;
  canSave: boolean;
}

export function SummarySetActions({
  importedSet,
  otherSets,
  switchOpen,
  switchRef,
  onToggleSwitch,
  onSelectSet,
  onSave,
  onEdit,
  onImport,
  canSave,
}: SummarySetActionsProps) {
  if (importedSet) {
    return (
      <div className="theme-divider mt-3 border-t pt-3">
        <div className="flex items-center justify-between gap-2">
          {otherSets.length > 0 ? (
            <div className="relative" ref={switchRef}>
              <button
                type="button"
                onClick={onToggleSwitch}
                className="theme-chip flex items-center gap-1 rounded-full px-3 py-1 text-xs"
              >
                Switch
                <span className="text-[9px] leading-none">
                  {switchOpen ? "▲" : "▼"}
                </span>
              </button>
              {switchOpen && (
                <div className="theme-menu absolute right-0 bottom-full z-30 mb-1.5 min-w-40 overflow-hidden rounded-2xl p-1">
                  {otherSets.map((set) => (
                    <button
                      key={set.speciesId}
                      type="button"
                      onClick={() => onSelectSet(set)}
                      className="theme-menu-item w-full rounded-xl px-3 py-2 text-left"
                    >
                      <div className="text-xs font-medium">
                        {set.nickname ?? set.speciesName}
                      </div>
                      {set.nickname ? (
                        <div className="theme-text-faint mt-0.5 text-[10px]">
                          {set.speciesName}
                        </div>
                      ) : null}
                      {(set.item || set.ability) && (
                        <div className="theme-text-faint mt-0.5 text-[10px]">
                          {[set.item, set.ability].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            {canSave && (
              <button
                type="button"
                onClick={onSave}
                className="theme-chip rounded-full px-3 py-1 text-xs"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="theme-chip rounded-full px-3 py-1 text-xs"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-divider mt-3 border-t pt-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {canSave && (
          <button
            type="button"
            onClick={onSave}
            className="theme-chip w-full rounded-2xl py-2 text-xs"
          >
            Save
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="theme-chip w-full rounded-2xl py-2 text-xs"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onImport}
          className="theme-chip w-full rounded-2xl py-2 text-xs"
        >
          Import
        </button>
      </div>
    </div>
  );
}
