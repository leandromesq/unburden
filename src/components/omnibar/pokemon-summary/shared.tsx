import { NATURE_MODIFIERS } from "@/lib/calc/stat-calc";
import type { StatSpread } from "@/lib/types";

export type SummaryStatKey = keyof StatSpread;

export const SUMMARY_STAT_LABELS: Array<[SummaryStatKey, string]> = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

const NATURE_STAT_LABELS: Record<string, string> = {
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export function formatNatureWithDescription(nature: string) {
  const mods = NATURE_MODIFIERS[nature] ?? {};
  const entries = Object.entries(mods) as Array<[string, number]>;
  const boosted = entries.find(([, value]) => value > 1);
  const lowered = entries.find(([, value]) => value < 1);

  if (!boosted && !lowered) {
    return nature;
  }

  const boostedLabel = boosted ? `+${NATURE_STAT_LABELS[boosted[0]]}` : null;
  const loweredLabel = lowered ? `-${NATURE_STAT_LABELS[lowered[0]]}` : null;
  const detail = [boostedLabel, loweredLabel].filter(Boolean).join("/");

  return `${nature} (${detail})`;
}

export function getNatureEffect(
  nature: string,
  stat: Exclude<SummaryStatKey, "hp">,
) {
  const value = (NATURE_MODIFIERS[nature] ?? {})[stat];
  if (value === undefined) {
    return undefined;
  }

  return value > 1 ? ("boost" as const) : ("nerf" as const);
}

interface MoveChipProps {
  moveName: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function MoveChip({
  moveName,
  isActive,
  onClick,
  disabled,
}: MoveChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`truncate rounded-lg px-2.5 py-1 text-xs transition-colors ${
        isActive
          ? "theme-chip-active"
          : disabled
            ? "theme-chip-disabled cursor-default"
            : "theme-pill-muted cursor-pointer"
      }`}
    >
      {moveName}
    </button>
  );
}
