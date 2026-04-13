"use client";

import { useShallow } from "zustand/react/shallow";

import { useOmniStore } from "@/store/use-omni-store";

export function StrictModeToggle() {
  const { strictMode, setStrictMode } = useOmniStore(
    useShallow((state) => ({
      strictMode: state.strictMode,
      setStrictMode: state.setStrictMode,
    })),
  );

  return (
    <div
      className="theme-toggle inline-flex shrink-0 rounded-full p-0.5"
      aria-label="Calculation mode"
    >
      {(
        [
          { label: "Fast", value: false },
          { label: "Strict", value: true },
        ] as const
      ).map((option) => {
        const active = strictMode === option.value;

        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            aria-label={`${option.label} calculation mode`}
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
