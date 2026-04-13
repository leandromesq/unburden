"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { buildCalculationContext } from "@/lib/calc/damage-engine";
import { koTextTone } from "@/lib/calc/ko-text";
import { serializeShareState } from "@/lib/share/serialize-share-state";
import { resolveReferencedImportedSet } from "@/lib/team/set-references";
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

function LinkIcon() {
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
      <path d="M6.25 9.75l3.5-3.5" />
      <path d="M5.1 6.9l-1.15 1.15a2.12 2.12 0 1 0 3 3l1.15-1.15" />
      <path d="M10.9 9.1l1.15-1.15a2.12 2.12 0 1 0-3-3L7.9 6.1" />
    </svg>
  );
}

function TextIcon() {
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
      <path d="M3 4.5h10" />
      <path d="M5.5 4.5v7" />
      <path d="M10.5 4.5v7" />
      <path d="M4 11.5h8" />
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
  const { input, results, parsed, strictMode } = useOmniStore(
    useShallow((state) => ({
      input: state.input,
      results: state.results,
      parsed: state.parsed,
      strictMode: state.strictMode,
    })),
  );
  const importedSets = useTeamStore((state) => state.importedSets);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const context = useMemo(
    () =>
      parsed
        ? buildCalculationContext(parsed, importedSets, { strictMode })
        : null,
    [parsed, importedSets, strictMode],
  );

  if (!parsed || !results.length) {
    return null;
  }

  if (!context) {
    return null;
  }

  const setCopied = (actionKey: string) => {
    if (copiedTimeoutRef.current !== null) {
      window.clearTimeout(copiedTimeoutRef.current);
    }
    setCopiedAction(actionKey);
    copiedTimeoutRef.current = window.setTimeout(() => {
      setCopiedAction((current) => (current === actionKey ? null : current));
    }, 1600);
  };

  const buildShareUrl = (archetype: string) => {
    if (typeof window === "undefined" || !input.trim()) {
      return null;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("prompt", input);
    const relevantSets = [
      resolveReferencedImportedSet(parsed.attackerSetReferenceId, importedSets),
      resolveReferencedImportedSet(parsed.defenderSetReferenceId, importedSets),
    ]
      .filter(
        (
          set,
        ): set is NonNullable<
          ReturnType<typeof resolveReferencedImportedSet>
        > => Boolean(set),
      )
      .filter(
        (set, index, collection) =>
          collection.findIndex(
            (candidate) => candidate.speciesId === set.speciesId,
          ) === index,
      );
    const serializedState = serializeShareState(relevantSets);

    if (serializedState) {
      url.searchParams.set("state", serializedState);
    } else {
      url.searchParams.delete("state");
    }
    if (strictMode) {
      url.searchParams.set("strict", "1");
    } else {
      url.searchParams.delete("strict");
    }
    url.hash = `result-${archetype}`;
    return url.toString();
  };

  const handleCopyUrl = async (archetype: string) => {
    const shareUrl = buildShareUrl(archetype);
    if (!shareUrl) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        fallbackCopyText(shareUrl);
      }
    } catch {
      fallbackCopyText(shareUrl);
    }

    setCopied(`url:${archetype}`);
  };

  const handleCopyText = async (archetype: string, showdownText: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(showdownText);
      } else {
        fallbackCopyText(showdownText);
      }
    } catch {
      fallbackCopyText(showdownText);
    }

    setCopied(`text:${archetype}`);
  };

  return (
    <div
      className="space-y-2.5"
      data-testid="results-panel"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Calculation results"
    >
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
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void handleCopyText(result.archetype, result.showdownText)
                  }
                  className={`theme-icon-button flex h-8 w-8 items-center justify-center rounded-full ${
                    copiedAction === `text:${result.archetype}`
                      ? "theme-icon-button-active"
                      : ""
                  }`}
                  aria-label={`Copy result text for ${resultLabel}`}
                  title={
                    copiedAction === `text:${result.archetype}`
                      ? "Copied text"
                      : "Copy result text"
                  }
                >
                  {copiedAction === `text:${result.archetype}` ? (
                    <CopyIcon copied />
                  ) : (
                    <TextIcon />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl(result.archetype)}
                  className={`theme-icon-button flex h-8 w-8 items-center justify-center rounded-full ${
                    copiedAction === `url:${result.archetype}`
                      ? "theme-icon-button-active"
                      : ""
                  }`}
                  aria-label={`Copy share URL for ${resultLabel}`}
                  title={
                    copiedAction === `url:${result.archetype}`
                      ? "Copied URL"
                      : "Copy share URL"
                  }
                >
                  {copiedAction === `url:${result.archetype}` ? (
                    <CopyIcon copied />
                  ) : (
                    <LinkIcon />
                  )}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
