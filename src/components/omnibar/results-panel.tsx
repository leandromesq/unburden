"use client";

import { buildCalculationContext } from "@/lib/calc/damage-engine";
import { koTextTone } from "@/lib/calc/ko-text";
import { useOmniStore } from "@/store/use-omni-store";

function BlockTitle({ archetype }: { archetype: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
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
            className="rounded-[28px] border border-zinc-800 bg-zinc-950/75 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.22)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <BlockTitle archetype={result.archetype} />
                <div className="mt-2 text-sm text-zinc-500">{archetype.summary}</div>
              </div>
              <div className={`text-sm font-medium ${koTextTone(result.koChanceText)}`}>
                {result.koChanceText}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 px-4 py-3">
              <div className="text-sm leading-6 text-zinc-200">{result.contextText}</div>
              <div className="mt-2 font-mono text-base text-zinc-50">{result.damageText}</div>
            </div>
            {result.assumptions.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.assumptions.map((assumption) => (
                  <div
                    key={`${result.archetype}-${assumption}`}
                    className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300"
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
