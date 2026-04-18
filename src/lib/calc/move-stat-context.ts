import { NATURE_MODIFIERS } from "@/lib/calc/stat-calc";
import { normalizeId } from "@/lib/data/loaders";

type AttackingStatKey = "atk" | "def" | "spa";
type NatureEffectDirection = "boost" | "nerf";
type NatureStatKey = "atk" | "def" | "spa" | "spd" | "spe";

export function resolveAttackingStatKey(
  moveId: string | null | undefined,
  moveCategory: string | null | undefined,
): AttackingStatKey {
  if (normalizeId(moveId ?? "") === "bodypress") {
    return "def";
  }

  return moveCategory === "Special" ? "spa" : "atk";
}

export function getNatureEffectDirectionForStat(
  nature: string | null | undefined,
  statKey: NatureStatKey,
): NatureEffectDirection | null {
  if (!nature) {
    return null;
  }

  const multiplier = NATURE_MODIFIERS[nature]?.[statKey];

  if (multiplier === undefined || multiplier === 1) {
    return null;
  }

  return multiplier > 1 ? "boost" : "nerf";
}

export function resolveAttackerRepresentativeNature(
  moveId: string | null | undefined,
  moveCategory: string | null | undefined,
  direction: NatureEffectDirection,
): string {
  const attackingStatKey = resolveAttackingStatKey(moveId, moveCategory);

  if (attackingStatKey === "def") {
    return direction === "boost" ? "Impish" : "Mild";
  }

  if (attackingStatKey === "spa") {
    return direction === "boost" ? "Modest" : "Adamant";
  }

  return direction === "boost" ? "Adamant" : "Modest";
}
