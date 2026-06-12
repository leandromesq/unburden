import {
  buildDamageMoveOverrides,
  hasDragonizeAbility,
} from "@/lib/calc/damage-adjustments";
import type { MoveEntry, ParsedCommand } from "@/lib/types";

function parsed(overrides: Partial<ParsedCommand> = {}) {
  return {
    isDoubleTarget: true,
    ...overrides,
  } satisfies Pick<
    ParsedCommand,
    | "fickleBeamDouble"
    | "roundDouble"
    | "rageFistHits"
    | "lastRespectsStacks"
    | "isDoubleTarget"
  >;
}

function move(overrides: Partial<MoveEntry> = {}) {
  return {
    id: "body-slam",
    type: "Normal",
    basePower: 85,
    isSpread: false,
    ...overrides,
  } satisfies Pick<MoveEntry, "id" | "type" | "basePower" | "isSpread">;
}

describe("damage adjustments", () => {
  test("recognizes Dragonize as a normalized ability", () => {
    expect(hasDragonizeAbility("Dragonize")).toBe(true);
    expect(hasDragonizeAbility("dragonize")).toBe(true);
    expect(hasDragonizeAbility("Torrent")).toBe(false);
  });

  test("applies Dragonize only to Normal-type moves", () => {
    expect(
      buildDamageMoveOverrides({
        parsed: parsed(),
        move: move(),
        attackerAbility: "Dragonize",
      }),
    ).toEqual({ type: "Dragon", basePower: 102 });

    expect(
      buildDamageMoveOverrides({
        parsed: parsed(),
        move: move({ type: "Ice" }),
        attackerAbility: "Dragonize",
      }),
    ).toBeUndefined();
  });

  test("applies move-specific base power overrides", () => {
    expect(
      buildDamageMoveOverrides({
        parsed: parsed({ fickleBeamDouble: true }),
        move: move({ id: "ficklebeam", basePower: 80 }),
        attackerAbility: undefined,
      }),
    ).toEqual({ basePower: 160 });

    expect(
      buildDamageMoveOverrides({
        parsed: parsed({ roundDouble: true }),
        move: move({ id: "round", basePower: 60 }),
        attackerAbility: undefined,
      }),
    ).toEqual({ basePower: 120 });

    expect(
      buildDamageMoveOverrides({
        parsed: parsed({ rageFistHits: 6 }),
        move: move({ id: "ragefist", basePower: 50 }),
        attackerAbility: undefined,
      }),
    ).toEqual({ basePower: 350 });

    expect(
      buildDamageMoveOverrides({
        parsed: parsed({ lastRespectsStacks: 3 }),
        move: move({ id: "lastrespects", basePower: 50 }),
        attackerAbility: undefined,
      }),
    ).toEqual({ basePower: 200 });
  });

  test("turns spread moves into normal target moves when single-target mode is requested", () => {
    expect(
      buildDamageMoveOverrides({
        parsed: parsed({ isDoubleTarget: false }),
        move: move({ id: "heatwave", isSpread: true }),
        attackerAbility: undefined,
      }),
    ).toEqual({ target: "normal" });
  });
});
