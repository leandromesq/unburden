export type CombinedProbabilityMode = "at-least-one" | "all" | "none";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function normalizeValidProbabilities(probabilities: Array<number | null | undefined>) {
  return probabilities
    .filter((probability): probability is number => probability !== null && probability !== undefined)
    .map((probability) => clampPercent(probability) / 100);
}

export function calculateCombinedProbability(
  probabilities: Array<number | null | undefined>,
  mode: CombinedProbabilityMode = "at-least-one",
) {
  const normalized = normalizeValidProbabilities(probabilities);

  if (normalized.length === 0) {
    return mode === "none" ? 100 : 0;
  }

  const result =
    mode === "all"
      ? normalized.reduce((product, probability) => product * probability, 1)
      : mode === "none"
        ? normalized.reduce((product, probability) => product * (1 - probability), 1)
        : 1 - normalized.reduce((product, probability) => product * (1 - probability), 1);

  return result * 100;
}

export function formatProbabilityPercent(value: number) {
  const clamped = clampPercent(value);

  if (clamped === 0 || clamped === 100) {
    return `${clamped}%`;
  }

  if (clamped < 0.1) {
    return "<0.1%";
  }

  if (clamped > 99.9) {
    return ">99.9%";
  }

  return `${clamped.toFixed(1)}%`;
}

export function calculateAndFormatCombinedProbability(
  probabilities: Array<number | null | undefined>,
  mode: CombinedProbabilityMode = "at-least-one",
) {
  return formatProbabilityPercent(
    calculateCombinedProbability(probabilities, mode),
  );
}
