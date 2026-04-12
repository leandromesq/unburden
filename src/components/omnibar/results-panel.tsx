"use client";

import { useState } from "react";

import { buildCalculationContext } from "@/lib/calc/damage-engine";
import { koTextTone } from "@/lib/calc/ko-text";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function BlockTitle({
  archetype,
  label,
}: {
  archetype: string;
  label?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div
        className="h-3.5 w-0.5 rounded-full"
        style={{ background: "var(--accent)" }}
        aria-hidden
      />
      <div className="theme-text-dim text-xs font-semibold uppercase tracking-[0.24em]">
        {label ??
          (archetype === "glass"
            ? "Min Bulk"
            : archetype === "mid"
              ? "Mid Bulk"
              : "Max Bulk")}
      </div>
    </div>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8.5l2.5 2.5 6-6" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5.25" y="3.25" width="7.5" height="9" rx="1.5" />
      <path d="M3.25 10.5V5.75A1.5 1.5 0 0 1 4.75 4.25H9.5" />
    </svg>
  );
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ResultsPanel() {
  const input = useOmniStore((state) => state.input);
  const results = useOmniStore((state) => state.results);
  const parsed = useOmniStore((state) => state.parsed);
  const importedSets = useTeamStore((state) => state.importedSets);
  const [copiedArchetype, setCopiedArchetype] = useState<string | null>(null);

  if (!parsed || !results.length) {
    return null;
  }

  const context = buildCalculationContext(parsed, importedSets);

  if (!context) {
    return null;
  }

  const handleCopy = async (archetype: string) => {
    if (typeof window === "undefined" || !input.trim()) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("prompt", input);
    url.hash = `result-${archetype}`;
    const shareUrl = url.toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        fallbackCopyText(shareUrl);
      }
    } catch {
      fallbackCopyText(shareUrl);
    }

    setCopiedArchetype(archetype);
    window.setTimeout(() => {
      setCopiedArchetype((current) => (current === archetype ? null : current));
    }, 1600);
  };

  return (
    <div className="space-y-2.5" data-testid="results-panel">
      {results.map((result, index) => {
        const archetype = context.archetypes[index];
        const resultLabel =
          archetype.label ??
          (result.archetype === "glass"
            ? "Min Bulk"
            : result.archetype === "mid"
              ? "Mid Bulk"
              : "Max Bulk");

        return (
          <article
            key={result.archetype}
            id={`result-${result.archetype}`}
            className="theme-panel rounded-[26px] p-4"
          >
            <div className="mb-2.5">
              <BlockTitle
                archetype={result.archetype}
                label={archetype.label}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="theme-text-dim text-[13px]">
                  {archetype.summary}
                </div>
                <div
                  className={`shrink-0 text-[13px] font-semibold tabular-nums ${koTextTone(result.koChanceText)}`}
                >
                  {result.koChanceText}
                </div>
              </div>
            </div>
            <div className="theme-subpanel-strong rounded-2xl px-4 py-3.5">
              <div className="theme-text-dim text-[12px] leading-5">
                {result.contextText}
              </div>
              <div
                className="mt-2.5 font-mono text-base md:text-lg"
                style={{ color: "var(--text)" }}
              >
                {result.damageText}
              </div>
            </div>
            <div className="mt-2.5 flex items-end gap-2">
              {result.assumptions.length ? (
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {result.assumptions.map((assumption) => (
                    <div
                      key={`${result.archetype}-${assumption}`}
                      className="theme-pill-muted rounded-full px-2.5 py-1 text-[11px]"
                    >
                      {assumption}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => void handleCopy(result.archetype)}
                className={`theme-icon-button ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  copiedArchetype === result.archetype ? "theme-icon-button-active" : ""
                }`}
                aria-label={`Copy share URL for ${resultLabel}`}
                title={copiedArchetype === result.archetype ? "Copied" : "Copy share URL"}
              >
                <CopyIcon copied={copiedArchetype === result.archetype} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
