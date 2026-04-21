"use client";

import { useShallow } from "zustand/react/shallow";

import { useI18n } from "@/i18n/I18nProvider";
import { useOmniStore } from "@/store/use-omni-store";

export function StrictModeToggle() {
  const { dictionary } = useI18n();
  const { strictMode, setStrictMode } = useOmniStore(
    useShallow((state) => ({
      strictMode: state.strictMode,
      setStrictMode: state.setStrictMode,
    })),
  );

  return (
    <div
      className="theme-toggle inline-flex shrink-0 rounded-full p-0.5"
      aria-label={dictionary.strictMode.groupLabel}
    >
      {(
        [
          { label: dictionary.strictMode.fast, value: false },
          { label: dictionary.strictMode.strict, value: true },
        ] as const
      ).map((option) => {
        const active = strictMode === option.value;

        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            aria-label={dictionary.strictMode.optionAria(option.label)}
            className={`theme-toggle-option rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              active ? "theme-toggle-option-active" : ""
            }`}
            onClick={() => setStrictMode(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
