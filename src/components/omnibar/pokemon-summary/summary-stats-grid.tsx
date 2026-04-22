import { applyStage } from "@/lib/calc/stat-calc";
import type { StatSpread } from "@/lib/types";

interface SummaryStatsGridProps {
  natureEffects: Partial<
    Record<Exclude<keyof StatSpread, "hp">, "boost" | "nerf">
  >;
  stats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  stageBoosts: StatSpread;
  itemBoosts: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  showLevelLabel: boolean;
  level: number;
}

interface StatItemProps {
  label: string;
  value: number;
  stage?: number;
  itemMultiplier?: number;
  natureEffect?: "boost" | "nerf";
}

function StatItem({
  label,
  value,
  stage = 0,
  itemMultiplier = 1,
  natureEffect,
}: StatItemProps) {
  const stageEffective = applyStage(value, stage);
  const effective =
    itemMultiplier !== 1
      ? Math.floor(stageEffective * itemMultiplier)
      : stageEffective;
  const isBoosted = stage > 0 || itemMultiplier > 1;
  const isNerfed = stage < 0;
  const hasNatureArrow = natureEffect === "boost" || natureEffect === "nerf";
  const arrowColor =
    natureEffect === "boost" ? "var(--accent-strong)" : "var(--text-dim)";

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
        {label}
      </span>
      <span
        className="font-mono text-sm"
        style={{
          color: isBoosted
            ? "var(--accent-strong)"
            : isNerfed
              ? "var(--text-dim)"
              : "var(--text)",
        }}
      >
        {effective}
      </span>
      {stage !== 0 && hasNatureArrow ? (
        <span className="relative ml-0.5 inline-flex h-4 w-5 items-end justify-center">
          <span
            className="text-[9px] leading-none"
            style={{ color: arrowColor }}
          >
            {natureEffect === "boost" ? "▲" : "▼"}
          </span>
          <span
            className="absolute -top-0.5 left-1/2 -translate-x-1/2 font-mono text-[8px] leading-none"
            style={{
              color: isBoosted ? "var(--accent-strong)" : "var(--text-dim)",
            }}
          >
            {stage > 0 ? `+${stage}` : `${stage}`}
          </span>
        </span>
      ) : (
        <>
          {hasNatureArrow && (
            <span
              className="text-[9px] leading-none"
              style={{ color: arrowColor }}
            >
              {natureEffect === "boost" ? "▲" : "▼"}
            </span>
          )}
          {stage !== 0 && (
            <span
              className="font-mono text-[9px]"
              style={{
                color: isBoosted ? "var(--accent-strong)" : "var(--text-dim)",
              }}
            >
              {stage > 0 ? `+${stage}` : `${stage}`}
            </span>
          )}
        </>
      )}
      {itemMultiplier !== 1 && (
        <span
          className="font-mono text-[9px]"
          style={{ color: "var(--accent-strong)" }}
        >
          ×{itemMultiplier}
        </span>
      )}
    </div>
  );
}

export function SummaryStatsGrid({
  natureEffects,
  stats,
  stageBoosts,
  itemBoosts,
  showLevelLabel,
  level,
}: SummaryStatsGridProps) {
  return (
    <div className="theme-divider mt-4 border-t pt-3">
      <div className="mb-2">
        <span className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
          {showLevelLabel ? `Stats · Lv. ${level}` : "Base Stats"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        <StatItem label="HP" value={stats.hp} stage={stageBoosts.hp} />
        <StatItem
          label="Atk"
          value={stats.atk}
          stage={stageBoosts.atk}
          itemMultiplier={itemBoosts.atk}
          natureEffect={natureEffects.atk}
        />
        <StatItem
          label="Def"
          value={stats.def}
          stage={stageBoosts.def}
          itemMultiplier={itemBoosts.def}
          natureEffect={natureEffects.def}
        />
        <StatItem
          label="SpA"
          value={stats.spa}
          stage={stageBoosts.spa}
          itemMultiplier={itemBoosts.spa}
          natureEffect={natureEffects.spa}
        />
        <StatItem
          label="SpD"
          value={stats.spd}
          stage={stageBoosts.spd}
          itemMultiplier={itemBoosts.spd}
          natureEffect={natureEffects.spd}
        />
        <StatItem
          label="Spe"
          value={stats.spe}
          stage={stageBoosts.spe}
          itemMultiplier={itemBoosts.spe}
          natureEffect={natureEffects.spe}
        />
      </div>
    </div>
  );
}
