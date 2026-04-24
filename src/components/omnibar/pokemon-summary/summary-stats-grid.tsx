import { applyStage } from "@/lib/calc/stat-calc";
import type { PokemonStatus, StatSpread } from "@/lib/types";
import type { SummaryStatKey } from "@/components/omnibar/pokemon-summary/shared";

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
  currentHpPercent: number;
  stageBoosts: StatSpread;
  itemBoosts: {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  ability: string | null;
  status: PokemonStatus | null;
  showLevelLabel: boolean;
  level: number;
  onChangeStage: (stat: SummaryStatKey, nextValue: number) => void;
}

interface StatItemProps {
  statKey: SummaryStatKey;
  label: string;
  value: number;
  inputValue: number;
  stage?: number;
  itemMultiplier?: number;
  statusMultiplier?: number;
  natureEffect?: "boost" | "nerf";
  onChangeStage: (stat: SummaryStatKey, nextValue: number) => void;
}

function normalizeAbilityId(ability: string | null | undefined) {
  return (ability ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getStatusStatMultiplier(
  statKey: SummaryStatKey,
  status: PokemonStatus | null,
  ability: string | null,
) {
  const normalizedAbility = normalizeAbilityId(ability);

  if (statKey === "atk") {
    if (status && normalizedAbility === "guts") {
      return 1.5;
    }

    if (status === "brn") {
      return 0.5;
    }

    return 1;
  }

  if (statKey === "spe") {
    if (status && normalizedAbility === "quickfeet") {
      return 1.5;
    }

    if (status === "par") {
      return 0.5;
    }
  }

  return 1;
}

function StatItem({
  statKey,
  label,
  value,
  inputValue,
  stage = 0,
  itemMultiplier = 1,
  statusMultiplier = 1,
  natureEffect,
  onChangeStage,
}: StatItemProps) {
  const stageEffective = applyStage(value, stage);
  const combinedMultiplier = itemMultiplier * statusMultiplier;
  const effective =
    combinedMultiplier !== 1
      ? Math.floor(stageEffective * combinedMultiplier)
      : stageEffective;
  const isBoosted = stage > 0 || combinedMultiplier > 1;
  const isNerfed = stage < 0 || combinedMultiplier < 1;
  const hasNatureArrow = natureEffect === "boost" || natureEffect === "nerf";
  const hasStageMarker = stage !== 0;
  const hasMarkerSlot = hasNatureArrow || hasStageMarker;
  const arrowColor =
    natureEffect === "boost" ? "var(--accent-strong)" : "var(--text-dim)";
  const inputLabel = statKey === "hp" ? `${label} %` : `${label} stage`;
  const stageText = stage > 0 ? `+${stage}` : `${stage}`;

  return (
    <div className="min-w-0">
      <span className="theme-text-faint shrink-0 text-[11px] font-medium">
        {label}
      </span>
      <div className="mt-0.5 flex min-w-0 items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-nowrap items-baseline gap-1.5 whitespace-nowrap">
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
          {hasMarkerSlot && (
            <span className="relative ml-0.5 inline-flex h-4 w-4 shrink-0 items-end justify-center">
              {hasNatureArrow ? (
                <span
                  className="text-[9px] leading-none"
                  style={{ color: arrowColor }}
                >
                  {natureEffect === "boost" ? "▲" : "▼"}
                </span>
              ) : null}
              {hasStageMarker ? (
                <span
                  className={`font-mono leading-none ${
                    hasNatureArrow
                      ? "absolute -top-0.5 left-1/2 -translate-x-1/2 text-[8px]"
                      : "text-[9px]"
                  }`}
                  style={{
                    color: isBoosted ? "var(--accent-strong)" : "var(--text-dim)",
                  }}
                >
                  {stageText}
                </span>
              ) : null}
            </span>
          )}
          {itemMultiplier !== 1 && (
            <span
              className="shrink-0 font-mono text-[9px]"
              style={{ color: "var(--accent-strong)" }}
            >
              ×{itemMultiplier}
            </span>
          )}
        </div>
        {statKey === "hp" ? (
          <span className="theme-text-faint shrink-0 font-mono text-[10px]">
            %
          </span>
        ) : null}
        <input
          type="number"
          inputMode="numeric"
          min={statKey === "hp" ? 0 : -6}
          max={statKey === "hp" ? 100 : 6}
          step={1}
          value={inputValue}
          aria-label={inputLabel}
          onChange={(event) =>
            onChangeStage(statKey, Number(event.currentTarget.value))
          }
          className={`theme-control theme-input h-6 shrink-0 rounded-[6px] bg-[var(--surface-2)] px-1.5 text-center font-mono text-[11px] tabular-nums ${
            statKey === "hp" ? "w-16" : "w-13"
          }`}
        />
      </div>
    </div>
  );
}

export function SummaryStatsGrid({
  natureEffects,
  stats,
  currentHpPercent,
  stageBoosts,
  itemBoosts,
  ability,
  status,
  showLevelLabel,
  level,
  onChangeStage,
}: SummaryStatsGridProps) {
  return (
    <div className="theme-divider mt-4 border-t pt-3">
      <div className="mb-2">
        <span className="text-sm font-medium">
          {showLevelLabel ? `Stats · Lv. ${level}` : "Base Stats"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <StatItem
          statKey="hp"
          label="HP"
          value={stats.hp}
          inputValue={currentHpPercent}
          stage={stageBoosts.hp}
          statusMultiplier={getStatusStatMultiplier("hp", status, ability)}
          onChangeStage={onChangeStage}
        />
        <StatItem
          statKey="atk"
          label="Atk"
          value={stats.atk}
          inputValue={stageBoosts.atk}
          stage={stageBoosts.atk}
          itemMultiplier={itemBoosts.atk}
          statusMultiplier={getStatusStatMultiplier("atk", status, ability)}
          natureEffect={natureEffects.atk}
          onChangeStage={onChangeStage}
        />
        <StatItem
          statKey="def"
          label="Def"
          value={stats.def}
          inputValue={stageBoosts.def}
          stage={stageBoosts.def}
          itemMultiplier={itemBoosts.def}
          statusMultiplier={getStatusStatMultiplier("def", status, ability)}
          natureEffect={natureEffects.def}
          onChangeStage={onChangeStage}
        />
        <StatItem
          statKey="spa"
          label="SpA"
          value={stats.spa}
          inputValue={stageBoosts.spa}
          stage={stageBoosts.spa}
          itemMultiplier={itemBoosts.spa}
          statusMultiplier={getStatusStatMultiplier("spa", status, ability)}
          natureEffect={natureEffects.spa}
          onChangeStage={onChangeStage}
        />
        <StatItem
          statKey="spd"
          label="SpD"
          value={stats.spd}
          inputValue={stageBoosts.spd}
          stage={stageBoosts.spd}
          itemMultiplier={itemBoosts.spd}
          statusMultiplier={getStatusStatMultiplier("spd", status, ability)}
          natureEffect={natureEffects.spd}
          onChangeStage={onChangeStage}
        />
        <StatItem
          statKey="spe"
          label="Spe"
          value={stats.spe}
          inputValue={stageBoosts.spe}
          stage={stageBoosts.spe}
          itemMultiplier={itemBoosts.spe}
          statusMultiplier={getStatusStatMultiplier("spe", status, ability)}
          natureEffect={natureEffects.spe}
          onChangeStage={onChangeStage}
        />
      </div>
    </div>
  );
}
