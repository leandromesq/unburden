import { normalizeId } from "@/lib/data/normalization";
import type { MoveEntry, ParsedCommand } from "@/lib/types";

interface DamageMoveOverrides {
  type?: "Dragon";
  basePower?: number;
  target?: "normal";
}

interface DamageMoveAdjustmentContext {
  parsed: Pick<
    ParsedCommand,
    | "fickleBeamDouble"
    | "roundDouble"
    | "rageFistHits"
    | "lastRespectsStacks"
    | "isDoubleTarget"
  >;
  move: Pick<MoveEntry, "id" | "type" | "basePower" | "isSpread">;
  attackerAbility: string | undefined;
}

type DamageMoveAdjustment = (
  context: DamageMoveAdjustmentContext,
) => DamageMoveOverrides | null;

export function hasDragonizeAbility(ability: string | undefined) {
  return normalizeId(ability ?? "") === "dragonize";
}

const applyDragonize: DamageMoveAdjustment = ({ attackerAbility, move }) => {
  if (!hasDragonizeAbility(attackerAbility) || move.type !== "Normal") {
    return null;
  }

  return {
    type: "Dragon",
    basePower: Math.floor(move.basePower * 1.2),
  };
};

const applyFickleBeamDouble: DamageMoveAdjustment = ({ parsed, move }) => {
  if (!parsed.fickleBeamDouble || move.id !== "ficklebeam") {
    return null;
  }

  return { basePower: 160 };
};

const applyRoundDouble: DamageMoveAdjustment = ({ parsed, move }) => {
  if (!parsed.roundDouble || move.id !== "round") {
    return null;
  }

  return { basePower: 120 };
};

const applyRageFistHits: DamageMoveAdjustment = ({ parsed, move }) => {
  if (parsed.rageFistHits === undefined || move.id !== "ragefist") {
    return null;
  }

  return { basePower: Math.min(50 + 50 * parsed.rageFistHits, 350) };
};

const applyLastRespectsStacks: DamageMoveAdjustment = ({ parsed, move }) => {
  if (parsed.lastRespectsStacks === undefined || move.id !== "lastrespects") {
    return null;
  }

  return { basePower: 50 * (parsed.lastRespectsStacks + 1) };
};

const applySpreadSingleTarget: DamageMoveAdjustment = ({ parsed, move }) => {
  if (!move.isSpread || parsed.isDoubleTarget) {
    return null;
  }

  return { target: "normal" };
};

const DAMAGE_MOVE_ADJUSTMENTS: DamageMoveAdjustment[] = [
  applyDragonize,
  applyFickleBeamDouble,
  applyRoundDouble,
  applyRageFistHits,
  applyLastRespectsStacks,
  applySpreadSingleTarget,
];

export function buildDamageMoveOverrides(context: DamageMoveAdjustmentContext) {
  const overrides = DAMAGE_MOVE_ADJUSTMENTS.reduce<DamageMoveOverrides>(
    (current, adjustment) => ({
      ...current,
      ...(adjustment(context) ?? {}),
    }),
    {},
  );

  return Object.keys(overrides).length ? overrides : undefined;
}
