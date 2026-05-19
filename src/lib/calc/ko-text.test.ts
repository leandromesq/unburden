import { getDamageOutcomeLabel } from "@/lib/calc/ko-text";

const labels = {
  guaranteedOhko: "Guaranteed OHKO",
  ohkoRoll: "OHKO roll",
  guaranteedTwoHitPace: "Guaranteed 2HKO pace",
  twoHitRoll: "2HKO roll",
  comfortableSurvive: "Comfortable survive",
  chipDamage: "Chip damage",
};

describe("damage outcome labels", () => {
  test("prioritizes guaranteed OHKO from the minimum roll", () => {
    expect(getDamageOutcomeLabel(101, 120, "Guaranteed OHKO", labels)).toBe(
      labels.guaranteedOhko,
    );
  });

  test("does not call a 0 percent KO chance an OHKO roll", () => {
    expect(getDamageOutcomeLabel(40, 110, "0% chance to OHKO", labels)).toBe(
      labels.twoHitRoll,
    );
  });

  test("labels guaranteed and possible two-hit pressure from roll bounds", () => {
    expect(getDamageOutcomeLabel(52, 61, "Guaranteed 2HKO", labels)).toBe(
      labels.guaranteedTwoHitPace,
    );
    expect(getDamageOutcomeLabel(42, 57, "Possible 2HKO", labels)).toBe(
      labels.twoHitRoll,
    );
  });

  test("separates low damage from ordinary chip", () => {
    expect(getDamageOutcomeLabel(12, 22, "Possible 5HKO", labels)).toBe(
      labels.comfortableSurvive,
    );
    expect(getDamageOutcomeLabel(27, 38, "Possible 3HKO", labels)).toBe(
      labels.chipDamage,
    );
  });
});
