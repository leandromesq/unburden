import type { StatSpread } from "@/lib/types";
import {
  SUMMARY_STAT_LABELS,
  type SummaryStatKey,
} from "@/components/omnibar/pokemon-summary/shared";

type StatKey = SummaryStatKey;

const STAT_LABELS: Array<[StatKey, string]> = SUMMARY_STAT_LABELS;

interface SummarySpSpreadProps {
  side: "attacker" | "defender";
  currentStatPoints: StatSpread;
  isSpDepleted: boolean;
  spLeft: number;
  statInputDrafts: Record<StatKey, string>;
  onChangeInput: (stat: StatKey, rawValue: string, maxValue: number) => void;
  onChangeSlider: (stat: StatKey, nextValue: number, maxValue: number) => void;
}

export function SummarySpSpread({
  side,
  currentStatPoints,
  isSpDepleted,
  spLeft,
  statInputDrafts,
  onChangeInput,
  onChangeSlider,
}: SummarySpSpreadProps) {
  return (
    <div className="theme-divider mt-4 border-t pt-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="theme-data-label">SP Spread</div>
        <div className="theme-pill-muted rounded-md px-2 py-0.5 text-[11px] font-medium">
          <span
            className="theme-text-dim"
            style={{
              color: isSpDepleted ? "var(--accent-strong)" : undefined,
            }}
          >
            {`${spLeft} SP left`}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {STAT_LABELS.map(([statKey, label]) => {
          const value = currentStatPoints[statKey];
          const maxValue = Math.max(
            0,
            Math.min(
              32,
              66 -
                STAT_LABELS.reduce(
                  (total, [key]) =>
                    total + (key === statKey ? 0 : currentStatPoints[key]),
                  0,
                ),
            ),
          );

          return (
            <div
              key={statKey}
              className="theme-subpanel rounded-md px-2.5 py-1.5"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="theme-text-faint w-8 shrink-0 font-mono text-[11px] font-medium">
                  {label}
                </span>

                <div className="ml-auto flex items-center gap-1.5">
                  <label
                    className="sr-only"
                    htmlFor={`${side}-summary-${statKey}-sp`}
                  >
                    {label} SP
                  </label>

                  <input
                    id={`${side}-summary-${statKey}-sp`}
                    type="text"
                    inputMode="text"
                    aria-label={`${label} SP`}
                    value={statInputDrafts[statKey]}
                    onFocus={(event) => {
                      event.currentTarget.select();
                    }}
                    onChange={(event) => {
                      onChangeInput(
                        statKey,
                        event.currentTarget.value,
                        maxValue,
                      );
                    }}
                    className="theme-control theme-input h-7 w-16 rounded-md px-2 py-1 font-mono text-xs"
                  />

                  <span className="theme-text-dim font-mono text-[11px]">
                    SP
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={32}
                step={1}
                value={value}
                aria-label={`Set ${label} SP`}
                onChange={(event) => {
                  const requested = Number(event.currentTarget.value);
                  onChangeSlider(statKey, requested, maxValue);
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                style={{
                  background: "var(--line-strong)",
                  accentColor: "var(--accent)",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
