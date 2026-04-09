"use client";

import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";

import { GhostSuggestion } from "@/components/omnibar/ghost-suggestion";
import { useOmniStore } from "@/store/use-omni-store";

interface OmniTextareaProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const MAX_TEXTAREA_HEIGHT = 176;

export function OmniTextarea({ textareaRef }: OmniTextareaProps) {
  const input = useOmniStore((state) => state.input);
  const activeSuggestion = useOmniStore((state) => state.activeSuggestion);
  const setInput = useOmniStore((state) => state.setInput);
  const applySuggestion = useOmniStore((state) => state.applySuggestion);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0 });
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? localRef;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.style.height = "0px";
    const nextHeight = Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT);
    element.style.height = `${nextHeight}px`;
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
        placeholder="flutter mane !moonblast %75 * >+1 x ogerpon %50 <+nature ~rain"
        className="relative z-10 block min-h-[88px] w-full resize-none border-0 bg-transparent px-5 py-4 text-left font-mono text-lg leading-8 tracking-[-0.02em] text-zinc-100 outline-none placeholder:text-zinc-500 md:text-xl"
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            if (activeSuggestion) {
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
          }
        }}
        onSelect={(event) => {
          const element = event.currentTarget;
          setCaretAtEnd(
            element.selectionStart === element.selectionEnd &&
              element.selectionEnd === element.value.length,
          );
        }}
        onScroll={(event) => {
          setScrollState({
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          });
        }}
      />
      <GhostSuggestion
        value={input}
        ghostText={ghostText}
        scrollLeft={scrollState.left}
        scrollTop={scrollState.top}
      />
    </div>
  );
}
