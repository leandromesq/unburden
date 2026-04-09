"use client";

import type { RefObject } from "react";

import { useOmniStore } from "@/store/use-omni-store";

interface QuickSuggestionsProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function QuickSuggestions({ textareaRef }: QuickSuggestionsProps) {
  const suggestionOptions = useOmniStore((state) => state.suggestionOptions);
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
          className="rounded-full border border-zinc-700 bg-zinc-900/85 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
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
          <span className="font-mono text-zinc-100">{option.value}</span>
          {option.label !== option.value ? (
            <span className="ml-2 text-zinc-500">{option.label}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
