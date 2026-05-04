import { normalizeId } from "@/lib/data/normalization";

type AttackingStatKey = "atk" | "def" | "spa";
type NatureEffectDirection = "boost" | "nerf";

export function resolveAttackingStatKey(
  moveId: string | null | undefined,
  moveCategory: string | null | undefined,
): AttackingStatKey {
  if (normalizeId(moveId ?? "") === "bodypress") {
    return "def";
  }

  return moveCategory === "Special" ? "spa" : "atk";
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
