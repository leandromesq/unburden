"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import type { ImportedSet } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { dictionary } = useI18n();

  if (importedSet) {
    return (
      <div className="theme-divider mt-3 border-t pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {otherSets.length > 0 ? (
            <div className="relative max-w-full" ref={switchRef}>
              <button
                type="button"
                onClick={onToggleSwitch}
                className="theme-chip inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 text-xs"
              >
                {dictionary.summary.switch}
                {switchOpen ? (
                  <ChevronUp aria-hidden="true" size={12} strokeWidth={2.2} />
                ) : (
                  <ChevronDown
                    aria-hidden="true"
                    size={12}
                    strokeWidth={2.2}
                  />
                )}
              </button>
              {switchOpen && (
                <div className="theme-menu absolute right-0 bottom-full z-30 mb-1.5 min-w-40 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl p-1">
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
          ) : null}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            {canSave && (
              <button
                type="button"
                onClick={onSave}
                className="theme-chip rounded-full px-3 py-1 text-xs"
              >
                {dictionary.summary.save}
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="theme-chip rounded-full px-3 py-1 text-xs"
            >
              {dictionary.summary.edit}
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
            {dictionary.summary.save}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="theme-chip w-full rounded-2xl py-2 text-xs"
        >
          {dictionary.summary.edit}
        </button>
        <button
          type="button"
          onClick={onImport}
          className="theme-chip w-full rounded-2xl py-2 text-xs"
        >
          {dictionary.summary.import}
        </button>
      </div>
    </div>
  );
}
