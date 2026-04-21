"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText, Link2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useI18n } from "@/i18n/I18nProvider";
import { koTextTone } from "@/lib/calc/ko-text";
import { serializeShareState } from "@/lib/share/serialize-share-state";
import { resolveReferencedImportedSet } from "@/lib/team/set-references";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function BlockTitle({
  archetype,
  label,
  fallbackLabels,
}: {
  archetype: string;
  label?: string;
  fallbackLabels: {
    minBulk: string;
    midBulk: string;
    maxBulk: string;
  };
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
            ? fallbackLabels.minBulk
            : archetype === "mid"
              ? fallbackLabels.midBulk
              : fallbackLabels.maxBulk)}
      </div>
    </div>
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
  const { dictionary } = useI18n();
  const { results, parsed, strictMode } = useOmniStore(
    useShallow((state) => ({
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

  if (!parsed || !results.length) {
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
    const input = useOmniStore.getState().input;
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
      aria-label={dictionary.resultsPanel.ariaLabel}
    >
      {results.map((result) => {
        const resultLabel =
          result.label ??
          (result.archetype === "glass"
            ? dictionary.resultsPanel.minBulk
            : result.archetype === "mid"
              ? dictionary.resultsPanel.midBulk
              : dictionary.resultsPanel.maxBulk);

        return (
          <article
            key={result.archetype}
            id={`result-${result.archetype}`}
            className="theme-panel rounded-[26px] p-4"
          >
            <div className="mb-2.5">
              <BlockTitle
                archetype={result.archetype}
                label={result.label}
                fallbackLabels={dictionary.resultsPanel}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="theme-text-dim text-[13px]">{result.summary}</div>
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
                  aria-label={dictionary.resultsPanel.copyResultText(resultLabel)}
                  title={
                    copiedAction === `text:${result.archetype}`
                      ? dictionary.resultsPanel.copiedText
                      : dictionary.resultsPanel.copyResultText(resultLabel)
                  }
                >
                  {copiedAction === `text:${result.archetype}` ? (
                    <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                  ) : (
                    <FileText aria-hidden="true" size={15} strokeWidth={1.9} />
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
                  aria-label={dictionary.resultsPanel.copyShareUrl(resultLabel)}
                  title={
                    copiedAction === `url:${result.archetype}`
                      ? dictionary.resultsPanel.copiedUrl
                      : dictionary.resultsPanel.copyShareUrl(resultLabel)
                  }
                >
                  {copiedAction === `url:${result.archetype}` ? (
                    <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                  ) : (
                    <Link2 aria-hidden="true" size={15} strokeWidth={1.9} />
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
