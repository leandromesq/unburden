import {
  calculateAndFormatCombinedProbability,
  calculateCombinedProbability,
  formatProbabilityPercent,
} from "@/lib/calc/combined-probability";

describe("combined probability", () => {
  test("calculates the chance that at least one event happens", () => {
    expect(calculateCombinedProbability([30, 40], "at-least-one")).toBeCloseTo(58);
  });

  test("calculates the chance that all events happen", () => {
    expect(calculateCombinedProbability([30, 40], "all")).toBeCloseTo(12);
  });

  test("calculates the chance that no event happens", () => {
    expect(calculateCombinedProbability([30, 40], "none")).toBeCloseTo(42);
  });

  test("ignores null values and clamps invalid percentages", () => {
    expect(calculateCombinedProbability([null, undefined, -10, 200], "all")).toBe(0);
    expect(calculateCombinedProbability([null, undefined], "none")).toBe(100);
  });

  test("formats tactical probability labels", () => {
    expect(formatProbabilityPercent(0)).toBe("0%");
    expect(formatProbabilityPercent(100)).toBe("100%");
    expect(formatProbabilityPercent(0.04)).toBe("<0.1%");
    expect(formatProbabilityPercent(99.96)).toBe(">99.9%");
    expect(formatProbabilityPercent(58)).toBe("58.0%");
  });

  test("calculates and formats in one call", () => {
    expect(calculateAndFormatCombinedProbability([30, 40])).toBe("58.0%");
  });
});
