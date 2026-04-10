"use client";

import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";

import { GhostSuggestion } from "@/components/omnibar/ghost-suggestion";
import { useOmniStore } from "@/store/use-omni-store";

interface OmniTextareaProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmitReady?: () => void;
}

const MAX_TEXTAREA_HEIGHT = 176;

export function OmniTextarea({ textareaRef, onSubmitReady }: OmniTextareaProps) {
  const input = useOmniStore((state) => state.input);
  const activeSuggestion = useOmniStore((state) => state.activeSuggestion);
  const suggestionOptions = useOmniStore((state) => state.suggestionOptions);
  const calculationReady = useOmniStore((state) => state.calculationReady);
  const setInput = useOmniStore((state) => state.setInput);
  const setCursorIndex = useOmniStore((state) => state.setCursorIndex);
  const moveSuggestionSelection = useOmniStore((state) => state.moveSuggestionSelection);
  const applySuggestion = useOmniStore((state) => state.applySuggestion);
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<number | null>(null);
  const ref = textareaRef ?? localRef;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
    element.style.height = `${nextHeight}px`;

    if (pendingSelectionRef.current !== null) {
      const cursor = pendingSelectionRef.current;
      element.focus();
      element.setSelectionRange(cursor, cursor);
      pendingSelectionRef.current = null;
    }
  }, [input, ref]);

  const ghostText = useMemo(() => {
    if (!activeSuggestion || !caretAtEnd) {
      return "";
    }

    return activeSuggestion.ghostText;
  }, [activeSuggestion, caretAtEnd]);

  return (
    <div className="relative text-left">
      <textarea
        ref={ref}
        autoFocus
        rows={1}
        data-testid="omni-textarea"
        value={input}
        spellCheck={false}
        placeholder="politoed !muddy-water @mystic-water x incineroar ~rain"
        className="theme-input relative z-10 block min-h-[88px] w-full resize-none border-0 bg-transparent px-5 py-4 text-left font-mono text-lg leading-8 tracking-[-0.02em] outline-none md:text-xl"
        onChange={(event) =>
          setInput(
            event.target.value,
            event.currentTarget.selectionStart ?? event.target.value.length,
          )
        }
        onKeyDown={(event) => {
          if (event.key === "[" && !event.altKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            const element = event.currentTarget;
            const selectionStart = element.selectionStart ?? input.length;
            const selectionEnd = element.selectionEnd ?? selectionStart;
            const nextInput = `${input.slice(0, selectionStart)}[${input.slice(
              selectionStart,
              selectionEnd,
            )}]${input.slice(selectionEnd)}`;
            const cursor = selectionStart + 1;

            pendingSelectionRef.current = cursor;
            setInput(nextInput, cursor);
            setCaretAtEnd(cursor === nextInput.length);
            return;
          }

          if (event.key === "ArrowDown" && suggestionOptions.length) {
            event.preventDefault();
            moveSuggestionSelection(1);
            return;
          }

          if (event.key === "ArrowUp" && suggestionOptions.length) {
            event.preventDefault();
            moveSuggestionSelection(-1);
            return;
          }

          if (event.key === "Tab") {
            event.preventDefault();
            if (activeSuggestion || suggestionOptions.length) {
              applySuggestion();
              requestAnimationFrame(() => {
                const element = ref.current;
                if (!element) {
                  return;
                }

                const cursor = element.value.length;
                element.focus();
                element.setSelectionRange(cursor, cursor);
                setCaretAtEnd(true);
              });
            }
            return;
          }

          if (event.key === "Enter" && !event.shiftKey && calculationReady) {
            event.preventDefault();
            onSubmitReady?.();
          }
        }}
        onSelect={(event) => {
          const element = event.currentTarget;
          const cursorIndex = element.selectionEnd ?? element.value.length;
          setCursorIndex(cursorIndex);
          setCaretAtEnd(
            element.selectionStart === element.selectionEnd &&
              cursorIndex === element.value.length,
          );
        }}
      />
      <GhostSuggestion value={input} ghostText={ghostText} textareaRef={ref} />
    </div>
  );
}
