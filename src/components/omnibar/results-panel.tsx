"use client";

import { buildCalculationContext } from "@/lib/calc/damage-engine";
import { koTextTone } from "@/lib/calc/ko-text";
import { useOmniStore } from "@/store/use-omni-store";

function BlockTitle({ archetype }: { archetype: string }) {
  return (
    <div className="theme-text-dim text-xs font-semibold uppercase tracking-[0.24em]">
      {archetype === "glass" ? "Min Bulk" : archetype === "mid" ? "Mid Bulk" : "Max Bulk"}
    </div>
  );
}

export function ResultsPanel() {
  const results = useOmniStore((state) => state.results);
  const parsed = useOmniStore((state) => state.parsed);

  if (!parsed || !results.length) {
    return null;
  }

  const context = buildCalculationContext(parsed);

  if (!context) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="results-panel">
      {results.map((result, index) => {
        const archetype = context.archetypes[index];

        return (
          <article
            key={result.archetype}
            className="theme-panel rounded-[28px] p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <BlockTitle archetype={result.archetype} />
                <div className="theme-text-dim mt-2 text-sm">{archetype.summary}</div>
              </div>
              <div className={`text-sm font-medium ${koTextTone(result.koChanceText)}`}>
                {result.koChanceText}
              </div>
            </div>
            <div className="theme-subpanel rounded-2xl px-4 py-3">
              <div className="theme-text-muted text-sm leading-6">{result.contextText}</div>
              <div className="mt-2 font-mono text-base" style={{ color: "var(--text)" }}>
                {result.damageText}
              </div>
            </div>
            {result.assumptions.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.assumptions.map((assumption) => (
                  <div
                    key={`${result.archetype}-${assumption}`}
                    className="theme-chip rounded-full px-3 py-1.5 text-xs"
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
