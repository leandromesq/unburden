"use client";

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

export function ResultsPanel() {
  const results = useOmniStore((state) => state.results);
  const parsed = useOmniStore((state) => state.parsed);
  const importedSets = useTeamStore((state) => state.importedSets);

  if (!parsed || !results.length) {
    return null;
  }

  const context = buildCalculationContext(parsed, importedSets);

  if (!context) {
    return null;
  }

  return (
    <div className="space-y-2.5" data-testid="results-panel">
      {results.map((result, index) => {
        const archetype = context.archetypes[index];

        return (
          <article
            key={result.archetype}
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
            {result.assumptions.length ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {result.assumptions.map((assumption) => (
                  <div
                    key={`${result.archetype}-${assumption}`}
                    className="theme-pill-muted rounded-full px-2.5 py-1 text-[11px]"
                  >
                    {assumption}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
