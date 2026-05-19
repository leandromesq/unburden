"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText, Link2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useI18n } from "@/i18n/I18nProvider";
import { getDamageOutcomeLabel, koTextTone } from "@/lib/calc/ko-text";
import { serializeShareState } from "@/lib/share/serialize-share-state";
import { resolveReferencedImportedSet } from "@/lib/team/set-references";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function getBulkLabel(
  archetype: string,
  label: string | undefined,
  fallbackLabels: {
    minBulk: string;
    midBulk: string;
    maxBulk: string;
  },
) {
  return label ??
    (archetype === "glass"
      ? fallbackLabels.minBulk
      : archetype === "mid"
        ? fallbackLabels.midBulk
        : fallbackLabels.maxBulk);
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

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getDamageBandMetrics(minPercentage: number, maxPercentage: number) {
  const isGuaranteedOhko = minPercentage >= 100;
  const left = clampPercent(minPercentage);
  const right = clampPercent(maxPercentage);

  return {
    isGuaranteedOhko,
    left: isGuaranteedOhko ? 0 : left,
    width: isGuaranteedOhko ? 100 : Math.max(1.5, right - left),
  };
}

export function ResultsPanel() {
  const { dictionary } = useI18n();
  const { results, parsed } = useOmniStore(
    useShallow((state) => ({
      results: state.results,
      parsed: state.parsed,
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
        const resultLabel = getBulkLabel(
          result.archetype,
          result.label,
          dictionary.resultsPanel,
        );
        const outcomeLabel = getDamageOutcomeLabel(
          result.minPercentage,
          result.maxPercentage,
          result.koChanceText,
          dictionary.resultsPanel,
        );
        const band = getDamageBandMetrics(
          result.minPercentage,
          result.maxPercentage,
        );

        return (
          <article
            key={result.archetype}
            id={`result-${result.archetype}`}
            className="theme-panel theme-results-card rounded-xl p-4"
          >
            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="theme-results-outcome rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em]">
                    {outcomeLabel}
                  </span>
                  <h2 className="theme-text-faint text-xs">{resultLabel}</h2>
                </div>
                <div
                  className="font-mono text-[18px] leading-6 md:text-[20px]"
                  style={{ color: "var(--text)" }}
                >
                  {result.damageText}
                </div>
                <div className="theme-text-dim mt-1 text-[12px] leading-5">
                  {result.summary}
                </div>
              </div>
              <div className="theme-results-ko rounded-lg px-3 py-2 text-left md:text-right">
                <div className="theme-data-label">{dictionary.resultsPanel.koChance}</div>
                <div
                  className={`mt-1 font-mono text-[13px] font-semibold tabular-nums ${koTextTone(result.koChanceText)}`}
                >
                  {result.koChanceText}
                </div>
              </div>
            </div>
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="theme-data-label">{dictionary.resultsPanel.damageRange}</div>
                <div className="theme-data-text text-[11px]">
                  {band.isGuaranteedOhko
                    ? `Guaranteed OHKO, ${result.minPercentage.toFixed(1)}% to ${result.maxPercentage.toFixed(1)}%`
                    : `${result.minPercentage.toFixed(1)}% to ${result.maxPercentage.toFixed(1)}%`}
                </div>
              </div>
              <div
                className={`theme-results-band relative h-2.5 overflow-hidden rounded-full ${
                  band.isGuaranteedOhko ? "theme-results-band-ohko" : ""
                }`}
              >
                <div
                  className="theme-results-band-fill absolute inset-y-0 rounded-full"
                  style={{
                    left: `${band.left}%`,
                    width: `${band.width}%`,
                  }}
                />
              </div>
            </div>
            <div className="theme-subpanel-strong rounded-lg px-4 py-3.5">
              <div className="theme-data-label">Calc</div>
              <div className="theme-data-text mt-1 text-[12px] leading-5 md:text-[13px]">
                {result.contextText}
              </div>
              {result.damageRolls.length ? (
                <details className="theme-rolls-details mt-3">
                  <summary className="theme-data-label cursor-pointer select-none">
                    Rolls ({result.damageRolls.length})
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.damageRolls.map((roll, index) => (
                      <span
                        key={`${result.archetype}-roll-${index}-${roll.damage}`}
                        className={`theme-roll-chip rounded-md px-2 py-1 font-mono text-[11px] leading-none tabular-nums ${
                          roll.percentage >= 100 ? "theme-roll-chip-ohko" : ""
                        }`}
                      >
                        {roll.damage} ({roll.percentage.toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
            <div className="mt-2.5 flex items-end gap-2">
              {result.assumptions.length ? (
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {result.assumptions.map((assumption) => (
                    <div
                      key={`${result.archetype}-${assumption}`}
                      className="theme-pill-muted rounded-md px-2.5 py-1 font-mono text-[11px]"
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
                  className={`theme-icon-button theme-icon-button-sm ${
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
                  <span
                    className="t-icon-swap"
                    data-state={
                      copiedAction === `text:${result.archetype}` ? "b" : "a"
                    }
                    aria-hidden="true"
                  >
                    <FileText
                      className="t-icon"
                      data-icon="a"
                      size={15}
                      strokeWidth={1.9}
                    />
                    <Check
                      className="t-icon"
                      data-icon="b"
                      size={15}
                      strokeWidth={2.2}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyUrl(result.archetype)}
                  className={`theme-icon-button theme-icon-button-sm ${
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
                  <span
                    className="t-icon-swap"
                    data-state={
                      copiedAction === `url:${result.archetype}` ? "b" : "a"
                    }
                    aria-hidden="true"
                  >
                    <Link2
                      className="t-icon"
                      data-icon="a"
                      size={15}
                      strokeWidth={1.9}
                    />
                    <Check
                      className="t-icon"
                      data-icon="b"
                      size={15}
                      strokeWidth={2.2}
                    />
                  </span>
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
