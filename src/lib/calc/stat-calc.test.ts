import {
  clampStatPoints,
  evToStatPointsValue,
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

  test("rounds EV values to the expected SP value", () => {
    expect(evToStatPointsValue(4)).toBe(1);
    expect(evToStatPointsValue(0)).toBe(0);
    expect(evToStatPointsValue(252)).toBe(32);
    expect(evToStatPointsValue(999)).toBe(32);
  });

  test("rounds EV values across the smallest conversion boundary", () => {
    expect(evToStatPointsValue(3)).toBe(0);
    expect(evToStatPointsValue(4)).toBe(1);
    expect(
      evsToStatPoints({
        hp: 3,
        atk: 4,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
      }),
    ).toEqual({
      hp: 0,
      atk: 1,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
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

  test("never emits calc EVs above 252", () => {
    expect(
      statPointsToCalcEvs({
        hp: 40,
        atk: 33,
        def: 32,
        spa: 100,
        spd: 50,
        spe: 999,
      }),
    ).toEqual({
      hp: 252,
      atk: 252,
      def: 252,
      spa: 252,
      spd: 252,
      spe: 252,
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

  test("removes overflow by iterating through the documented removal order until total fits", () => {
    expect(
      clampStatPoints({
        hp: 32,
        atk: 10,
        def: 10,
        spa: 10,
        spd: 10,
        spe: 10,
      }),
    ).toEqual({
      hp: 30,
      atk: 8,
      def: 7,
      spa: 7,
      spd: 7,
      spe: 7,
    });
  });

  test("reduces overflow one pass at a time until the total reaches 66", () => {
    const clamped = clampStatPoints({
      hp: 32,
      atk: 32,
      def: 32,
      spa: 32,
      spd: 32,
      spe: 32,
    });

    expect(clamped).toEqual({
      hp: 11,
      atk: 11,
      def: 11,
      spa: 11,
      spd: 11,
      spe: 11,
    });
    expect(sumStatPoints(clamped)).toBe(66);
  });

  test("returns the original spread when already within limits", () => {
    const spread = {
      hp: 32,
      atk: 0,
      def: 1,
      spa: 13,
      spd: 1,
      spe: 19,
    };

    expect(clampStatPoints(spread)).toEqual(spread);
    expect(sumStatPoints(spread)).toBe(66);
  });

  test("never leaves the total above 66 after clamping arbitrary spreads", () => {
    const clamped = clampStatPoints({
      hp: 999,
      atk: 999,
      def: 999,
      spa: 999,
      spd: 999,
      spe: 999,
    });

    expect(sumStatPoints(clamped)).toBeLessThanOrEqual(66);
    expect(clamped).toEqual({
      hp: 11,
      atk: 11,
      def: 11,
      spa: 11,
      spd: 11,
      spe: 11,
    });
  });
});
