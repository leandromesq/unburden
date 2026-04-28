"use client";

import type { RefObject } from "react";
import { useShallow } from "zustand/react/shallow";

import { useOmniStore } from "@/store/use-omni-store";

interface QuickSuggestionsProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function QuickSuggestions({ textareaRef }: QuickSuggestionsProps) {
  const { suggestionOptions, highlightedSuggestionIndex, applySuggestionText } =
    useOmniStore(
      useShallow((state) => ({
        suggestionOptions: state.suggestionOptions,
        highlightedSuggestionIndex: state.highlightedSuggestionIndex,
        applySuggestionText: state.applySuggestionText,
      })),
    );

  if (!suggestionOptions.length) {
    return null;
  }

  return (
    <div className="border-t theme-divider flex flex-wrap gap-2 px-4 py-3 md:px-5">
      {suggestionOptions.slice(0, 6).map((option, index) => (
        <button
          key={`${option.value}-${index}`}
          type="button"
          aria-pressed={highlightedSuggestionIndex === index}
          className={`inline-flex max-w-full min-w-0 items-center overflow-hidden rounded-md px-3 py-1.5 text-sm ${
            highlightedSuggestionIndex === index
              ? "theme-chip-active"
              : "theme-chip"
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
          <span
            className="min-w-0 truncate font-mono text-[12px]"
            style={{ color: "var(--text)" }}
          >
            {option.value}
          </span>
          {option.label !== option.value ? (
            <span className="theme-text-dim ml-2 truncate text-[11px]">
              {option.label}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
