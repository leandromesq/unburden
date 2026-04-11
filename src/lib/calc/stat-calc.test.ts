import {
  clampStatPoints,
  evsToStatPoints,
  statPointsToCalcEvs,
  sumStatPoints,
} from "@/lib/calc/stat-calc";

describe("stat point utilities", () => {
  test("ports EV spreads to Champions SPs", () => {
    expect(
      evsToStatPoints({
        hp: 252,
        atk: 0,
        def: 8,
        spa: 100,
        spd: 4,
        spe: 148,
      }),
    ).toEqual({
      hp: 32,
      atk: 0,
      def: 1,
      spa: 13,
      spd: 1,
      spe: 19,
    });
  });

  test("derives calc EVs from stat points", () => {
    expect(
      statPointsToCalcEvs({
        hp: 32,
        atk: 0,
        def: 1,
        spa: 13,
        spd: 1,
        spe: 19,
      }),
    ).toEqual({
      hp: 252,
      atk: 0,
      def: 8,
      spa: 104,
      spd: 8,
      spe: 152,
    });
  });

  test("clamps stat points to the per-stat and total caps", () => {
    const clamped = clampStatPoints({
      hp: 40,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
    });

    expect(clamped.hp).toBeLessThanOrEqual(32);
    expect(sumStatPoints(clamped)).toBeLessThanOrEqual(66);
  });
});
