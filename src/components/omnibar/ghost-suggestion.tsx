"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

interface GhostSuggestionProps {
  value: string;
  ghostText: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export const TEXT_MIRROR_STYLE_KEYS = [
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "boxSizing",
  "fontFamily",
  "fontFeatureSettings",
  "fontKerning",
  "fontSize",
  "fontStretch",
  "fontStyle",
  "fontVariant",
  "fontVariantLigatures",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "tabSize",
  "textAlign",
  "textIndent",
  "textRendering",
  "textTransform",
  "whiteSpace",
  "wordBreak",
  "wordSpacing",
  "overflowWrap",
  "direction",
] as const;

export function GhostSuggestion({ value, ghostText, textareaRef }: GhostSuggestionProps) {
  const flowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const flow = flowRef.current;

    if (!textarea || !flow || !ghostText) {
      return;
    }

    const computedStyle = window.getComputedStyle(textarea);

    flow.style.width = `${textarea.clientWidth}px`;
    flow.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;

    for (const key of TEXT_MIRROR_STYLE_KEYS) {
      flow.style[key] = computedStyle[key];
    }

    flow.style.whiteSpace = "pre-wrap";
    flow.style.wordBreak = "break-word";
    flow.style.overflowWrap = "break-word";
  }, [ghostText, textareaRef, value]);

  if (!ghostText) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div ref={flowRef} data-testid="ghost-suggestion">
        <span className="invisible">{value || "\u200b"}</span>
        <span className="theme-ghost-text">{ghostText}</span>
      </div>
    </div>
  );
}
