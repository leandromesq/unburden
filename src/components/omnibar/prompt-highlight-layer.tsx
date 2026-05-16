"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";

import { TEXT_MIRROR_STYLE_KEYS } from "@/components/omnibar/ghost-suggestion";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import type { LexToken } from "@/lib/parser/tokenize";

type PromptTokenKind =
  | "pokemon"
  | "set"
  | "move"
  | "item"
  | "ability"
  | "modifier"
  | "global"
  | "hp"
  | "critical"
  | "spread"
  | "separator"
  | "invalid";

interface HighlightToken {
  start: number;
  end: number;
  kind: PromptTokenKind;
  priority: number;
}

const TOKEN_CLASS_BY_KIND: Record<PromptTokenKind, string> = {
  ability: "theme-prompt-token-ability",
  critical: "theme-prompt-token-critical",
  global: "theme-prompt-token-global",
  hp: "theme-prompt-token-hp",
  invalid: "theme-prompt-token-invalid",
  item: "theme-prompt-token-item",
  modifier: "theme-prompt-token-modifier",
  move: "theme-prompt-token-move",
  pokemon: "theme-prompt-token-pokemon",
  separator: "theme-prompt-token-separator",
  set: "theme-prompt-token-set",
  spread: "theme-prompt-token-spread",
};

function symbolKindToPromptKind(
  kind: ReturnType<typeof analyzeCommandStructure>["attacker"]["symbolTokens"][number]["kind"],
  scope: ReturnType<typeof analyzeCommandStructure>["attacker"]["symbolTokens"][number]["scope"],
): PromptTokenKind {
  if (kind === "stat_points") {
    return "spread";
  }

  if (kind === "modifier" && scope === "global") {
    return "global";
  }

  if (kind === "unknown") {
    return "invalid";
  }

  return kind;
}

function tokenRange(
  token: LexToken,
  kind: PromptTokenKind,
  priority = 1,
): HighlightToken {
  return {
    end: token.end,
    kind,
    priority,
    start: token.start,
  };
}

function collectPromptHighlightTokens(value: string) {
  if (!value.trim()) {
    return [];
  }

  const structure = analyzeCommandStructure(value);
  const ranges = new Map<string, HighlightToken>();

  const addRange = (range: HighlightToken) => {
    if (range.end <= range.start) {
      return;
    }

    const key = `${range.start}:${range.end}`;
    const current = ranges.get(key);
    if (!current || range.priority >= current.priority) {
      ranges.set(key, range);
    }
  };

  const addSpeciesTokens = (tokens: LexToken[]) => {
    for (const token of tokens) {
      addRange(tokenRange(token, token.raw.startsWith("#") ? "set" : "pokemon"));
    }
  };

  const addSegmentTokens = (
    segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  ) => {
    addSpeciesTokens(segment.speciesTokens);

    for (const token of segment.symbolTokens) {
      addRange(
        tokenRange(
          token.source,
          symbolKindToPromptKind(token.kind, token.scope),
          2,
        ),
      );
    }

    for (const token of segment.unknownExplicitTokens) {
      addRange(tokenRange(token, "invalid", 3));
    }

    for (const token of segment.misplacedTokens) {
      addRange(tokenRange(token.source, "invalid", 3));
    }
  };

  addSegmentTokens(structure.attacker);
  addSegmentTokens(structure.defender);

  if (structure.lexed.delimiterIndex !== null) {
    const delimiter = structure.lexed.tokens[structure.lexed.delimiterIndex];
    if (delimiter) {
      addRange(tokenRange(delimiter, "separator", 2));
    }
  }

  return Array.from(ranges.values()).sort((first, second) => {
    if (first.start !== second.start) {
      return first.start - second.start;
    }

    return second.end - first.end;
  });
}

interface PromptHighlightLayerProps {
  value: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function PromptHighlightLayer({
  value,
  textareaRef,
}: PromptHighlightLayerProps) {
  const flowRef = useRef<HTMLDivElement>(null);
  const highlightTokens = useMemo(
    () => collectPromptHighlightTokens(value),
    [value],
  );

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const flow = flowRef.current;

    if (!textarea || !flow) {
      return;
    }

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
      if (frame !== null) {
        return;
      }

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

  if (!value) {
    return null;
  }

  const parts = [];
  let cursor = 0;

  for (const token of highlightTokens) {
    if (token.start < cursor) {
      continue;
    }

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
        data-token-kind={token.kind}
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
        data-testid="prompt-highlight-layer"
        className="theme-prompt-highlight-flow px-4 py-3 pr-12 md:px-5 md:pr-14"
      >
        {parts}
      </div>
    </div>
  );
}
