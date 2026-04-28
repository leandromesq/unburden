"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { GhostSuggestion } from "@/components/omnibar/ghost-suggestion";
import { PromptHighlightLayer } from "@/components/omnibar/prompt-highlight-layer";
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
    swapSides,
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
      swapSides: state.swapSides,
    })),
  );
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<number | null>(null);
  const ref = textareaRef ?? localRef;
  const clearPrompt = useCallback(() => {
    setInput("", 0);
    pendingSelectionRef.current = 0;
    setCaretAtEnd(true);
  }, [setInput]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const prefersDesktopFocus =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(pointer: fine)").matches
        : true;
    if (!prefersDesktopFocus) {
      return;
    }

    element.focus();
    const cursor = element.value.length;
    element.setSelectionRange(cursor, cursor);
  }, [ref]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();

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

      if (key === "k") {
        event.preventDefault();
        ref.current?.focus();
        return;
      }

      if (key === "x") {
        event.preventDefault();
        swapSides();
        return;
      }

      if (key === "backspace") {
        event.preventDefault();
        clearPrompt();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [clearPrompt, ref, swapSides]);

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
      {input ? (
        <button
          type="button"
          aria-label="Clear prompt"
          title="Clear prompt (Alt+Backspace)"
          onClick={clearPrompt}
          className="theme-icon-button theme-icon-button-sm absolute right-3 top-3 z-20 md:right-4 md:top-4"
        >
          <X aria-hidden="true" size={15} strokeWidth={2} />
        </button>
      ) : null}
      <PromptHighlightLayer value={input} textareaRef={ref} />
      <textarea
        ref={ref}
        rows={1}
        data-testid="omni-textarea"
        value={input}
        spellCheck={false}
        placeholder="#gliscor !earthquake adamant x incineroar bold ~rain"
        aria-keyshortcuts="Alt+K Alt+X Alt+Backspace"
        className="theme-input theme-prompt-input relative z-10 block min-h-18 w-full min-w-0 resize-none border-0 bg-transparent px-4 py-3 pr-12 text-left outline-none md:min-h-20 md:px-5 md:pr-14"
        onChange={(event) =>
          setInput(
            event.target.value,
            event.currentTarget.selectionStart ?? event.target.value.length,
          )
        }
        onKeyDown={(event) => {
          if (
            event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            event.key.toLowerCase() === "backspace"
          ) {
            event.preventDefault();
            clearPrompt();
            return;
          }

          if (
            event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            event.key.toLowerCase() === "x"
          ) {
            event.preventDefault();
            swapSides();
            return;
          }

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
