"use client";

import type { RefObject } from "react";
import { ChevronDown, ChevronUp, Repeat2 } from "lucide-react";

import type { ImportedSet } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

interface SummarySetActionsProps {
  importedSet: ImportedSet | null;
  otherSets: ImportedSet[];
  switchOpen: boolean;
  switchRef: RefObject<HTMLDivElement | null>;
  onToggleSwitch: () => void;
  onSelectSet: (set: ImportedSet) => void;
}

export function SummarySetActions({
  importedSet,
  otherSets,
  switchOpen,
  switchRef,
  onToggleSwitch,
  onSelectSet,
}: SummarySetActionsProps) {
  const { dictionary } = useI18n();
  const showSwitch = Boolean(importedSet && otherSets.length > 0);

  if (!showSwitch) {
    return null;
  }

  return (
    <div className="relative" ref={switchRef}>
      <button
        type="button"
        onClick={onToggleSwitch}
        aria-label={dictionary.summary.switch}
        title={dictionary.summary.switch}
        className="theme-icon-button flex h-8 w-10 items-center justify-center rounded-xl"
      >
        <span className="flex items-center justify-center gap-0.5">
          <Repeat2 aria-hidden="true" size={14} strokeWidth={2} />
          {switchOpen ? (
            <ChevronUp aria-hidden="true" size={10} strokeWidth={2.3} />
          ) : (
            <ChevronDown aria-hidden="true" size={10} strokeWidth={2.3} />
          )}
        </span>
      </button>

      {switchOpen ? (
        <div className="theme-menu absolute left-0 top-full z-30 mt-1.5 min-w-40 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl p-1">
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
              {set.item || set.ability ? (
                <div className="theme-text-faint mt-0.5 text-[10px]">
                  {[set.item, set.ability].filter(Boolean).join(" / ")}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
