"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { X } from "lucide-react";

import {
  TEXT_MIRROR_STYLE_KEYS,
  GhostSuggestion,
} from "@/components/omnibar/ghost-suggestion";
import { lexCommandInput } from "@/lib/parser/tokenize";
import type { SpeedAutocompleteOption } from "@/lib/speed/speed-autocomplete";

type SpeedPromptTokenKind =
  | "pokemon"
  | "set"
  | "item"
  | "ability"
  | "modifier"
  | "global"
  | "separator";

interface SpeedPromptToken {
  start: number;
  end: number;
  kind: SpeedPromptTokenKind;
}

const TOKEN_CLASS_BY_KIND: Record<SpeedPromptTokenKind, string> = {
  ability: "theme-prompt-token-ability",
  global: "theme-prompt-token-global",
  item: "theme-prompt-token-item",
  modifier: "theme-prompt-token-modifier",
  pokemon: "theme-prompt-token-pokemon",
  separator: "theme-prompt-token-separator",
  set: "theme-prompt-token-set",
};

const SPEED_MODIFIER_PATTERN =
  /^(?:spe-sp:\d{1,2}|spe[+-][1-6]|[+-][1-6]|[+-]speed|[+-]nature|neutral|tailwind|paralysis|par|unburden-active)$/i;

function classifySpeedToken(raw: string): SpeedPromptTokenKind {
  if (raw.startsWith("~")) return "global";
  if (raw.startsWith("#")) return "set";
  if (raw.startsWith("@")) return "item";
  if (raw.startsWith("[") && raw.endsWith("]")) return "ability";
  if (/^(choice|scarf|iron|ball|macho|brace)$/i.test(raw)) return "item";
  if (SPEED_MODIFIER_PATTERN.test(raw)) return "modifier";

  return "pokemon";
}

function collectSpeedPromptTokens(value: string) {
  if (!value.trim()) return [];

  const lexed = lexCommandInput(value);
  const tokens: SpeedPromptToken[] = [];

  for (const [index, token] of lexed.tokens.entries()) {
    tokens.push({
      start: token.start,
      end: token.end,
      kind: index === lexed.delimiterIndex ? "separator" : classifySpeedToken(token.raw),
    });
  }

  return tokens;
}

function SpeedPromptHighlightLayer({
  value,
  textareaRef,
}: {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const flowRef = useRef<HTMLDivElement>(null);
  const highlightTokens = useMemo(
    () => collectSpeedPromptTokens(value),
    [value],
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const flow = flowRef.current;

    if (!textarea || !flow) return;

    let frame: number | null = null;

    const syncMirrorNow = () => {
      const computedStyle = window.getComputedStyle(textarea);

      flow.style.width = `${textarea.clientWidth}px`;
      flow.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;

      for (const key of TEXT_MIRROR_STYLE_KEYS) {
        flow.style[key] = computedStyle[key];
      }

      flow.style.whiteSpace = "pre-wrap";
      flow.style.wordBreak = "break-word";
      flow.style.overflowWrap = "break-word";
    };

    const syncMirror = () => {
      if (frame !== null) return;

      frame = window.requestAnimationFrame(() => {
        frame = null;
        syncMirrorNow();
      });
    };

    syncMirrorNow();
    textarea.addEventListener("scroll", syncMirror, { passive: true });
    window.addEventListener("resize", syncMirror);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      textarea.removeEventListener("scroll", syncMirror);
      window.removeEventListener("resize", syncMirror);
    };
  }, [textareaRef]);

  if (!value) return null;

  const parts = [];
  let cursor = 0;

  for (const token of highlightTokens) {
    if (token.start > cursor) {
      parts.push(
        <span key={`plain-${cursor}`} className="theme-prompt-token-default">
          {value.slice(cursor, token.start)}
        </span>,
      );
    }

    parts.push(
      <span
        key={`${token.kind}-${token.start}-${token.end}`}
        className={TOKEN_CLASS_BY_KIND[token.kind]}
      >
        {value.slice(token.start, token.end)}
      </span>,
    );
    cursor = token.end;
  }

  if (cursor < value.length) {
    parts.push(
      <span key={`plain-${cursor}`} className="theme-prompt-token-default">
        {value.slice(cursor)}
      </span>,
    );
  }

  return (
    <div
      aria-hidden="true"
      className="theme-prompt-highlight-layer pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        ref={flowRef}
        className="theme-prompt-highlight-flow px-4 py-3 pr-12 md:px-5 md:pr-14"
      >
        {parts}
      </div>
    </div>
  );
}

function ghostTextForOption(input: string, option: SpeedAutocompleteOption | undefined) {
  if (!input.trim() || !option || option.replaceTo !== input.length) return "";

  const replacing = input.slice(option.replaceFrom, option.replaceTo);
  const replacement = `${option.value}${option.suffix ?? ""}`;

  if (
    replacing &&
    replacement.toLowerCase().startsWith(replacing.toLowerCase())
  ) {
    return replacement.slice(replacing.length);
  }

  return replacing ? "" : replacement;
}

interface SpeedPromptTextareaProps {
  value: string;
  suggestions: SpeedAutocompleteOption[];
  highlightedSuggestionIndex: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
  onMoveSuggestion: (delta: number) => void;
  onApplySuggestion: (option: SpeedAutocompleteOption) => void;
  onSwapSides: () => void;
}

const MAX_TEXTAREA_HEIGHT = 176;

export function SpeedPromptTextarea({
  value,
  suggestions,
  highlightedSuggestionIndex,
  textareaRef,
  onChange,
  onClear,
  onMoveSuggestion,
  onApplySuggestion,
  onSwapSides,
}: SpeedPromptTextareaProps) {
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const pendingSelectionRef = useRef<number | null>(null);
  const activeSuggestion =
    suggestions[highlightedSuggestionIndex] ?? suggestions[0];
  const ghostText = caretAtEnd
    ? ghostTextForOption(value, activeSuggestion)
    : "";

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;

    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;

    if (pendingSelectionRef.current !== null) {
      const cursor = pendingSelectionRef.current;
      element.focus();
      element.setSelectionRange(cursor, cursor);
      pendingSelectionRef.current = null;
    }
  }, [value, textareaRef]);

  function clearPrompt() {
    pendingSelectionRef.current = 0;
    setCaretAtEnd(true);
    onClear();
  }

  function applySuggestion(option: SpeedAutocompleteOption | undefined) {
    if (!option) return;
    onApplySuggestion(option);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
      onSwapSides();
      return;
    }

    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      onMoveSuggestion(1);
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      onMoveSuggestion(-1);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      applySuggestion(activeSuggestion);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      applySuggestion(activeSuggestion);
    }
  }

  return (
    <div className="relative min-w-0 text-left">
      {value ? (
        <button
          type="button"
          aria-label="Clear prompt"
          title="Clear prompt (Alt+Backspace)"
          onClick={clearPrompt}
          className="theme-icon-button theme-icon-button-sm absolute right-3 top-3 z-[var(--z-dropdown)] md:right-4 md:top-4"
        >
          <X aria-hidden="true" size={15} strokeWidth={2} />
        </button>
      ) : null}

      <SpeedPromptHighlightLayer value={value} textareaRef={textareaRef} />
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        spellCheck={false}
        placeholder="basculegion @choice-scarf x aerodactyl spe-1 tailwind ~rain"
        aria-label="Speed prompt"
        aria-keyshortcuts="Alt+X Alt+Backspace"
        className="theme-input theme-prompt-input relative z-10 block min-h-18 w-full min-w-0 resize-none border-0 bg-transparent px-4 py-3 pr-12 text-left outline-none md:min-h-20 md:px-5 md:pr-14"
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setCaretAtEnd(
            event.currentTarget.selectionStart === event.currentTarget.value.length,
          );
        }}
        onKeyDown={handleKeyDown}
        onSelect={(event) => {
          const element = event.currentTarget;
          setCaretAtEnd(
            element.selectionStart === element.selectionEnd &&
              element.selectionEnd === element.value.length,
          );
        }}
      />
      <GhostSuggestion value={value} ghostText={ghostText} textareaRef={textareaRef} />
    </div>
  );
}
