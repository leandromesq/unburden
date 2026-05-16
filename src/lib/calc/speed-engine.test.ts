import {
  buildEffectiveSpeed,
  compareMoveOrder,
  findSpeSpThreshold,
} from "@/lib/calc/speed-engine";

const base100 = {
  baseStats: {
    spe: 100,
  },
};

describe("speed engine", () => {
  test("computes level 50 Speed from Champions SPs and 31 IVs", () => {
    expect(
      buildEffectiveSpeed(base100, {
        speSp: 0,
        natureBucket: "neutral",
      }).effectiveSpeed,
    ).toBe(120);
    expect(
      buildEffectiveSpeed(base100, {
        speSp: 32,
        natureBucket: "neutral",
      }).effectiveSpeed,
    ).toBe(152);
  });

  test("applies speed nature buckets", () => {
    expect(buildEffectiveSpeed(base100, { speSp: 32, natureBucket: "plus" }).effectiveSpeed).toBe(167);
    expect(buildEffectiveSpeed(base100, { speSp: 32, natureBucket: "minus" }).effectiveSpeed).toBe(136);
  });

  test("applies stages, item, tailwind, and paralysis", () => {
    expect(buildEffectiveSpeed(base100, { speSp: 32, speedStage: 1 }).effectiveSpeed).toBe(228);
    expect(buildEffectiveSpeed(base100, { speSp: 32, item: "Choice Scarf" }).effectiveSpeed).toBe(228);
    expect(buildEffectiveSpeed(base100, { speSp: 32, hasTailwind: true }).effectiveSpeed).toBe(304);
    expect(buildEffectiveSpeed(base100, { speSp: 32, status: "par" }).effectiveSpeed).toBe(76);
  });

  test("supports conditional speed abilities", () => {
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Chlorophyll" }).effectiveSpeed).toBe(152);
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Chlorophyll", weather: "Sun" }).effectiveSpeed).toBe(304);
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Swift Swim", weather: "Rain" }).effectiveSpeed).toBe(304);
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Sand Rush", weather: "Sand" }).effectiveSpeed).toBe(304);
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Slush Rush", weather: "Snow" }).effectiveSpeed).toBe(304);
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Surge Surfer", terrain: "Electric" }).effectiveSpeed).toBe(304);
  });

  test("supports quick feet and unburden active state", () => {
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Quick Feet", status: "par" }).effectiveSpeed).toBe(228);
    expect(buildEffectiveSpeed(base100, { speSp: 32, ability: "Unburden" }).effectiveSpeed).toBe(152);
    expect(
      buildEffectiveSpeed(base100, {
        speSp: 32,
        ability: "Unburden",
        abilityActiveStates: ["unburden-active"],
      }).effectiveSpeed,
    ).toBe(304);
  });

  test("compares move order with and without trick room", () => {
    expect(compareMoveOrder(153, 152)).toBe("subject-first");
    expect(compareMoveOrder(151, 152)).toBe("benchmark-first");
    expect(compareMoveOrder(151, 152, true)).toBe("subject-first");
    expect(compareMoveOrder(152, 152, true)).toBe("tie");
  });

  test("finds normal and trick room SP thresholds", () => {
    expect(
      findSpeSpThreshold(base100, 140, {
        natureBucket: "neutral",
      }).moveFirstSpeSp,
    ).toBe(21);
    expect(
      findSpeSpThreshold(base100, 140, {
        natureBucket: "neutral",
        trickRoom: true,
      }).moveFirstSpeSp,
    ).toBe(19);
  });
});
