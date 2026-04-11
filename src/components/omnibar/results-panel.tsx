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
    <div className="space-y-3" data-testid="results-panel">
      {results.map((result, index) => {
        const archetype = context.archetypes[index];

        return (
          <article
            key={result.archetype}
            className="theme-panel rounded-3xl p-4"
          >
            <div className="mb-3">
              <BlockTitle
                archetype={result.archetype}
                label={archetype.label}
              />
              <div className="flex items-end justify-between gap-3">
                <div className="theme-text-dim text-sm">
                  {archetype.summary}
                </div>
                <div
                  className={`shrink-0 text-sm font-semibold tabular-nums ${koTextTone(result.koChanceText)}`}
                >
                  {result.koChanceText}
                </div>
              </div>
            </div>
            <div className="theme-subpanel rounded-2xl px-4 py-3">
              <div className="theme-text-muted text-sm leading-6">
                {result.contextText}
              </div>
              <div
                className="mt-2 font-mono text-base"
                style={{ color: "var(--text)" }}
              >
                {result.damageText}
              </div>
            </div>
            {result.assumptions.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.assumptions.map((assumption) => (
                  <div
                    key={`${result.archetype}-${assumption}`}
                    className="rounded-full border px-3 py-1 text-xs"
                    style={{
                      borderColor: "var(--line-strong)",
                      color: "var(--text-dim)",
                    }}
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
