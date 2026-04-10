"use client";

import type { RefObject } from "react";

import { useOmniStore } from "@/store/use-omni-store";

interface QuickSuggestionsProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function QuickSuggestions({ textareaRef }: QuickSuggestionsProps) {
  const suggestionOptions = useOmniStore((state) => state.suggestionOptions);
  const highlightedSuggestionIndex = useOmniStore(
    (state) => state.highlightedSuggestionIndex,
  );
  const applySuggestionText = useOmniStore((state) => state.applySuggestionText);

  if (!suggestionOptions.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {suggestionOptions.slice(0, 6).map((option, index) => (
        <button
          key={`${option.value}-${index}`}
          type="button"
          tabIndex={-1}
          aria-pressed={highlightedSuggestionIndex === index}
          className={`rounded-full px-3 py-1.5 text-sm ${
            highlightedSuggestionIndex === index ? "theme-chip-active" : "theme-chip"
          }`}
          onClick={() => {
            applySuggestionText(option.applyText);
            requestAnimationFrame(() => {
              const element = textareaRef.current;
              if (!element) {
                return;
              }

              const cursor = element.value.length;
              element.focus();
              element.setSelectionRange(cursor, cursor);
            });
          }}
        >
          <span className="font-mono" style={{ color: "var(--text)" }}>
            {option.value}
          </span>
          {option.label !== option.value ? (
            <span className="theme-text-dim ml-2">{option.label}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
