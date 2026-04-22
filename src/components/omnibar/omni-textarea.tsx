"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";

import { GhostSuggestion } from "@/components/omnibar/ghost-suggestion";
import { useOmniStore } from "@/store/use-omni-store";

interface OmniTextareaProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmitReady?: () => void;
}

const MAX_TEXTAREA_HEIGHT = 176;

function trimSingleTokenSelectionEnd(
  value: string,
  selectionStart: number,
  selectionEnd: number,
) {
  if (selectionStart >= selectionEnd) {
    return selectionEnd;
  }

  const selectedText = value.slice(selectionStart, selectionEnd);
  const trimmedSelectedText = selectedText.replace(/\s+$/u, "");
  if (
    trimmedSelectedText.length === selectedText.length ||
    !trimmedSelectedText ||
    /\s/u.test(trimmedSelectedText)
  ) {
    return selectionEnd;
  }

  return selectionStart + trimmedSelectedText.length;
}

export function OmniTextarea({
  textareaRef,
  onSubmitReady,
}: OmniTextareaProps) {
  const {
    input,
    activeSuggestion,
    suggestionOptions,
    calculationReady,
    setInput,
    setCursorIndex,
    moveSuggestionSelection,
    applySuggestion,
  } = useOmniStore(
    useShallow((state) => ({
      input: state.input,
      activeSuggestion: state.activeSuggestion,
      suggestionOptions: state.suggestionOptions,
      calculationReady: state.calculationReady,
      setInput: state.setInput,
      setCursorIndex: state.setCursorIndex,
      moveSuggestionSelection: state.moveSuggestionSelection,
      applySuggestion: state.applySuggestion,
    })),
  );
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<number | null>(null);
  const ref = textareaRef ?? localRef;

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.key.toLowerCase() !== "k" ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement)
      ) {
        return;
      }

      event.preventDefault();
      ref.current?.focus();
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [ref]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      element.style.height = "0px";
      const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
      element.style.height = `${nextHeight}px`;

      if (pendingSelectionRef.current !== null) {
        const cursor = pendingSelectionRef.current;
        element.focus();
        element.setSelectionRange(cursor, cursor);
        pendingSelectionRef.current = null;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [input, ref]);

  const ghostText = useMemo(() => {
    if (!activeSuggestion || !caretAtEnd) {
      return "";
    }

    return activeSuggestion.ghostText;
  }, [activeSuggestion, caretAtEnd]);

  return (
    <div className="relative min-w-0 text-left">
      <textarea
        ref={ref}
        autoFocus
        rows={1}
        data-testid="omni-textarea"
        value={input}
        spellCheck={false}
        placeholder="politoed !muddy-water @mystic-water x incineroar ~rain"
        aria-keyshortcuts="Alt+K"
        className="theme-input relative z-10 block min-h-20 w-full min-w-0 resize-none border-0 bg-transparent px-4 py-3 text-left font-mono text-base leading-7 tracking-[-0.02em] outline-none md:min-h-22 md:px-5 md:py-4 md:text-xl md:leading-8"
        onChange={(event) =>
          setInput(
            event.target.value,
            event.currentTarget.selectionStart ?? event.target.value.length,
          )
        }
        onKeyDown={(event) => {
          if (
            event.key === "[" &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
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
            element.setSelectionRange(cursor, cursor);
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
              const nextState = useOmniStore.getState();
              pendingSelectionRef.current = nextState.cursorIndex;
              setCaretAtEnd(
                nextState.cursorIndex === nextState.input.length,
              );
            }
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            if (calculationReady) {
              onSubmitReady?.();
            }
          }
        }}
        onSelect={(event) => {
          const element = event.currentTarget;
          const selectionStart = element.selectionStart ?? element.value.length;
          const trimmedSelectionEnd = trimSingleTokenSelectionEnd(
            element.value,
            selectionStart,
            element.selectionEnd ?? selectionStart,
          );
          if (
            trimmedSelectionEnd !== (element.selectionEnd ?? selectionStart)
          ) {
            element.setSelectionRange(selectionStart, trimmedSelectionEnd);
          }

          const cursorIndex = trimmedSelectionEnd;
          const nextCaretAtEnd =
            selectionStart === trimmedSelectionEnd &&
            cursorIndex === element.value.length;

          setCursorIndex(cursorIndex);
          setCaretAtEnd((current) =>
            current === nextCaretAtEnd ? current : nextCaretAtEnd,
          );
        }}
      />
      <GhostSuggestion value={input} ghostText={ghostText} textareaRef={ref} />
    </div>
  );
}
